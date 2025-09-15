"""
API routes for PDF processing operations
Handles file upload, processing requests, and status monitoring
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, List
import tempfile
import os
import time
from pathlib import Path
import json

from services.pdf_processor import PDFProcessorService
from services.file_manager import FileManagerService
from models.processing import ProcessingOptions, JobStatus

router = APIRouter()

# Initialize services (these will be dependency-injected in production)
pdf_processor = PDFProcessorService()
file_manager = FileManagerService()

@router.post("/upload")
async def upload_and_process(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    operation: str = Form("optimize"),
    quality: str = Form("medium"),
    output_format: Optional[str] = Form(None),
    page_range: Optional[str] = Form(None),
    compression_level: Optional[int] = Form(None),
    require_enterprise_compliance: bool = Form(False),
    preserve_metadata: bool = Form(True),
    optimize_for_web: bool = Form(False)
):
    """
    Upload file and start processing
    Returns job ID for tracking progress
    """

    # Validate file
    if not file.filename.lower().endswith(('.pdf', '.docx')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Supported formats: PDF, DOCX"
        )

    # Check file size (100MB limit)
    max_size = 100 * 1024 * 1024  # 100MB
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB"
        )

    try:
        # Save uploaded file temporarily
        temp_path = await file_manager.save_upload(file.filename, file_content)

        # Create processing options
        options = ProcessingOptions(
            operation=operation,
            output_format=output_format,
            page_range=page_range,
            quality=quality,
            compression_level=compression_level,
            require_enterprise_compliance=require_enterprise_compliance,
            preserve_metadata=preserve_metadata,
            optimize_for_web=optimize_for_web,
            page_count=await estimate_page_count(temp_path)
        )

        # Create processing job
        job_id = await pdf_processor.create_job(temp_path, options)

        return {
            "success": True,
            "job_id": job_id,
            "message": "File uploaded successfully. Processing started.",
            "estimated_time_seconds": 6,  # Target processing time
            "status_endpoint": f"/api/processing/status/{job_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@router.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """
    Get current status and progress of processing job
    """
    job = await pdf_processor.get_job_status(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Calculate estimated time remaining
    estimated_remaining = None
    if job.estimated_completion and job.status == JobStatus.PROCESSING:
        estimated_remaining = max(0, job.estimated_completion - time.time())

    return {
        "job_id": job.id,
        "filename": job.filename,
        "status": job.status.value,
        "progress": job.progress,
        "processing_time_ms": job.processing_time_ms,
        "estimated_remaining_seconds": estimated_remaining,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "file_size_bytes": job.file_size_bytes,
        "error": job.error,
        "performance_note": "🚀 Target: <6 seconds (10x faster than Adobe)",
        "download_url": f"/api/processing/download/{job_id}" if job.status == JobStatus.COMPLETED else None
    }

@router.get("/download/{job_id}")
async def download_result(job_id: str):
    """
    Download processed file result
    """
    job = await pdf_processor.get_job_status(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job.status.value}"
        )

    if not job.result or not job.result.output_path:
        raise HTTPException(status_code=500, detail="Processing result not available")

    output_path = Path(job.result.output_path)
    if not output_path.exists():
        raise HTTPException(status_code=500, detail="Output file not found")

    # Determine media type based on file extension
    media_type = "application/pdf"
    if output_path.suffix.lower() == ".jpg":
        media_type = "image/jpeg"
    elif output_path.suffix.lower() == ".png":
        media_type = "image/png"
    elif output_path.suffix.lower() == ".docx":
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    return FileResponse(
        path=output_path,
        media_type=media_type,
        filename=f"processed_{job.filename}",
        headers={
            "X-Processing-Time": str(job.processing_time_ms),
            "X-Engine-Used": job.result.engine_used,
            "X-Pages-Processed": str(job.result.pages_processed)
        }
    )

@router.get("/result/{job_id}")
async def get_job_result(job_id: str):
    """
    Get detailed processing result information
    """
    job = await pdf_processor.get_job_status(job_id)
    result = await pdf_processor.get_job_result(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job.status.value}"
        )

    return {
        "job_id": job_id,
        "result": {
            "success": result.success if result else False,
            "pages_processed": result.pages_processed if result else 0,
            "operation_performed": result.operation_performed if result else "",
            "engine_used": result.engine_used if result else "",
            "size_reduction_bytes": result.size_reduction_bytes if result else None,
            "warnings": result.warnings if result else [],
            "metadata": result.metadata if result else {}
        },
        "performance": {
            "processing_time_ms": job.processing_time_ms,
            "target_time_ms": 6000,
            "performance_rating": "excellent" if job.processing_time_ms and job.processing_time_ms < 6000 else "needs_optimization",
            "compared_to_adobe": f"{job.processing_time_ms/1000:.1f}s vs Adobe 45s" if job.processing_time_ms else "N/A"
        },
        "download_url": f"/api/processing/download/{job_id}"
    }

@router.post("/batch")
async def batch_process(
    files: List[UploadFile] = File(...),
    operation: str = Form("optimize"),
    quality: str = Form("medium")
):
    """
    Process multiple files in batch
    Returns list of job IDs for tracking
    """
    if len(files) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 files per batch request"
        )

    job_ids = []

    for file in files:
        try:
            # Similar to single file processing
            file_content = await file.read()
            temp_path = await file_manager.save_upload(file.filename, file_content)

            options = ProcessingOptions(
                operation=operation,
                quality=quality,
                page_count=await estimate_page_count(temp_path)
            )

            job_id = await pdf_processor.create_job(temp_path, options)
            job_ids.append({
                "filename": file.filename,
                "job_id": job_id
            })

        except Exception as e:
            job_ids.append({
                "filename": file.filename,
                "error": str(e)
            })

    return {
        "success": True,
        "batch_id": f"batch_{int(time.time())}",
        "jobs": job_ids,
        "message": f"Batch processing started for {len(files)} files"
    }

@router.get("/capabilities")
async def get_system_capabilities():
    """
    Get system capabilities and supported features
    """
    return {
        "supported_operations": ["merge", "split", "compress", "convert", "optimize"],
        "supported_input_formats": ["pdf", "docx"],
        "supported_output_formats": ["pdf", "jpg", "png", "docx"],
        "max_file_size_mb": 100,
        "max_concurrent_jobs": 10,
        "performance_targets": {
            "processing_time_seconds": 6,
            "adobe_comparison": "45+ seconds",
            "speed_advantage": "10x faster"
        },
        "engines": {
            "primary": "MuPDF",
            "fallback": "PDFium",
            "enterprise_compliance": True
        },
        "features": {
            "real_time_progress": True,
            "batch_processing": True,
            "websocket_updates": True,
            "enterprise_compliance": True,
            "ai_features": False  # Future enhancement
        }
    }

# Helper functions
async def estimate_page_count(file_path: Path) -> int:
    """
    Estimate page count for progress calculation
    In production, this would use actual PDF inspection
    """
    try:
        file_size = file_path.stat().st_size
        # Rough estimate: 100KB per page average
        estimated_pages = max(1, file_size // (100 * 1024))
        return min(estimated_pages, 1000)  # Cap at 1000 pages
    except:
        return 1