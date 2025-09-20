"""
PDF SaaS Platform - FastAPI Backend
Main application entry point with high-performance PDF processing
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import time
from typing import List, Optional
import asyncio
from pathlib import Path

from services.pdf_processor import PDFProcessorService, ProcessingOptions
from services.file_manager import FileManagerService
from models.processing import ProcessingJob, JobStatus, ProcessingResult
from api.routes import processing, health

app = FastAPI(
    title="PDF SaaS Platform API",
    description="High-performance PDF processing API - 10x faster than Adobe",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Initialize services
pdf_processor = PDFProcessorService()
file_manager = FileManagerService()

# Include API routes
app.include_router(processing.router, prefix="/api/processing", tags=["processing"])
app.include_router(health.router, prefix="/api/health", tags=["health"])

# Include authentication routes
from api.routes import auth
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])

# Include benchmark routes (temporarily disabled due to emoji encoding issues)
# from api.routes import benchmark
# app.include_router(benchmark.router, prefix="/api/benchmark", tags=["performance"])

# Include conversion routes
from api.routes import conversion
app.include_router(conversion.router, prefix="/api/conversion", tags=["conversion"])

@app.on_event("startup")
async def startup_event():
    """Initialize services and create required directories"""
    await pdf_processor.initialize()
    await file_manager.initialize()

    # Initialize LibreOffice processor
    from services.libreoffice_processor import libreoffice_processor
    libreoffice_success = await libreoffice_processor.initialize()

    if libreoffice_success:
        print("🚀 PDF SaaS Platform API started - Ready for sub-6 second PDF→PPT conversion!")
    else:
        print("⚠️ PDF SaaS Platform API started - LibreOffice conversion unavailable")
        print("💡 Install LibreOffice for PDF→PPT conversion support")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources"""
    await pdf_processor.cleanup()
    await file_manager.cleanup()
    print("✅ PDF SaaS Platform API shutdown complete")

@app.get("/")
async def root():
    """API root endpoint with system information"""
    return {
        "message": "PDF SaaS Platform API - 10x Faster than Adobe",
        "version": "1.0.0",
        "status": "operational",
        "performance": {
            "target_processing_time": "< 6 seconds",
            "adobe_comparison": "45+ seconds",
            "speed_advantage": "10x faster"
        },
        "endpoints": {
            "docs": "/api/docs",
            "health": "/api/health",
            "processing": "/api/processing"
        }
    }

# WebSocket endpoint for real-time processing updates
@app.websocket("/ws/processing/{job_id}")
async def websocket_processing_updates(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for real-time processing progress updates"""
    await websocket.accept()

    try:
        while True:
            # Get job status from processor
            job_status = await pdf_processor.get_job_status(job_id)

            if job_status:
                await websocket.send_json({
                    "job_id": job_id,
                    "status": job_status.status,
                    "progress": job_status.progress,
                    "estimated_completion": job_status.estimated_completion.isoformat() if job_status.estimated_completion else None,
                    "processing_time_ms": job_status.processing_time_ms
                })

                # Close connection when job is complete
                if job_status.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                    break

            await asyncio.sleep(0.5)  # Update every 500ms

    except Exception as e:
        print(f"WebSocket error for job {job_id}: {e}")
    finally:
        await websocket.close()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info"
    )