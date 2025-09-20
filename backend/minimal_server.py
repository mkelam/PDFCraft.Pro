#!/usr/bin/env python3
"""
Minimal FastAPI server for testing LibreOffice PDF->PPT conversion
No emojis, just functionality
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import tempfile
import os
from pathlib import Path
import uuid
import time
import hashlib
from typing import Dict, Any
import asyncio

# Import our LibreOffice processor
from services.libreoffice_processor import libreoffice_processor

app = FastAPI(
    title="PDF to PPT Converter API",
    description="LibreOffice-based PDF to PowerPoint conversion",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Store conversion jobs
conversion_jobs: Dict[str, Dict[str, Any]] = {}

@app.on_event("startup")
async def startup_event():
    """Initialize LibreOffice processor"""
    success = await libreoffice_processor.initialize()
    if success:
        print("API started - LibreOffice PDF to PPT conversion ready")
    else:
        print("API started - LibreOffice not available")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "PDF to PPT Conversion API",
        "version": "1.0.0",
        "endpoints": {
            "convert": "/convert/pdf-to-ppt",
            "status": "/convert/status/{job_id}",
            "download": "/convert/download/{job_id}"
        }
    }

@app.post("/convert/pdf-to-ppt")
async def convert_pdf_to_ppt(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to convert")
):
    """Convert PDF to PowerPoint"""

    # Validate file
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files supported")

    # Read file content
    content = await file.read()
    max_size = 25 * 1024 * 1024  # 25MB
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")

    # Create job
    job_id = str(uuid.uuid4())

    # Save uploaded file
    temp_dir = Path(tempfile.gettempdir()) / "pdf_uploads"
    temp_dir.mkdir(exist_ok=True)
    temp_file_path = temp_dir / f"upload_{job_id}.pdf"

    with open(temp_file_path, "wb") as temp_file:
        temp_file.write(content)

    # Initialize job tracking
    conversion_jobs[job_id] = {
        "status": "queued",
        "filename": file.filename,
        "file_size": len(content),
        "created_at": time.time(),
        "progress": 0
    }

    # Start conversion in background
    background_tasks.add_task(
        process_conversion,
        job_id=job_id,
        input_file=str(temp_file_path),
        filename=file.filename
    )

    return {
        "success": True,
        "job_id": job_id,
        "message": "Conversion started",
        "filename": file.filename
    }

@app.get("/convert/status/{job_id}")
async def get_status(job_id: str):
    """Get conversion status"""
    if job_id not in conversion_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = conversion_jobs[job_id]
    elapsed = time.time() - job["created_at"]

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "filename": job["filename"],
        "elapsed_time": elapsed,
        "error": job.get("error"),
        "conversion_time": job.get("conversion_time")
    }

@app.get("/convert/download/{job_id}")
async def download_file(job_id: str):
    """Download converted file"""
    if job_id not in conversion_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = conversion_jobs[job_id]
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail=f"Job not completed: {job['status']}")

    output_file = job.get("output_file")
    if not output_file or not Path(output_file).exists():
        raise HTTPException(status_code=404, detail="Converted file not found")

    filename = Path(job["filename"]).stem + "_converted.pptx"
    return FileResponse(path=output_file, filename=filename)

@app.get("/convert/jobs")
async def list_jobs():
    """List all conversion jobs"""
    return {"jobs": list(conversion_jobs.keys()), "total": len(conversion_jobs)}

async def process_conversion(job_id: str, input_file: str, filename: str):
    """Background conversion task"""
    try:
        # Update status
        conversion_jobs[job_id]["status"] = "processing"
        conversion_jobs[job_id]["progress"] = 10

        # Perform conversion
        result = await libreoffice_processor.convert_pdf_to_ppt(
            pdf_path=input_file,
            job_id=job_id
        )

        if result["success"]:
            conversion_jobs[job_id].update({
                "status": "completed",
                "progress": 100,
                "output_file": result["output_file"],
                "conversion_time": result["conversion_time_seconds"]
            })
            print(f"Conversion {job_id} completed successfully")
        else:
            conversion_jobs[job_id].update({
                "status": "failed",
                "error": result["error"]
            })
            print(f"Conversion {job_id} failed: {result['error']}")

    except Exception as e:
        conversion_jobs[job_id].update({
            "status": "failed",
            "error": str(e)
        })
        print(f"Conversion {job_id} crashed: {str(e)}")

    finally:
        # Cleanup input file
        try:
            if Path(input_file).exists():
                os.unlink(input_file)
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("minimal_server:app", host="0.0.0.0", port=8080, reload=True)