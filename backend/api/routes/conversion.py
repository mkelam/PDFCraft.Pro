"""
PDF to PPT Conversion API Routes
FastAPI endpoints for LibreOffice-based PDF→PowerPoint conversion
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict, Any
import tempfile
import os
from pathlib import Path
import uuid
import time
import hashlib

from services.libreoffice_processor import libreoffice_processor

router = APIRouter()

# Store conversion jobs for tracking
conversion_jobs: Dict[str, Dict[str, Any]] = {}

@router.post("/pdf-to-ppt", response_model=Dict[str, Any])
async def convert_pdf_to_ppt(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to convert to PowerPoint")
):
    """
    Convert PDF to PowerPoint presentation

    - **file**: PDF file (max 25MB)
    - Returns job ID for tracking conversion progress
    """

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported"
        )

    # Validate file size (25MB limit as per frontend)
    max_size = 25 * 1024 * 1024  # 25MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
        )

    # Calculate upload checksum for integrity verification
    upload_hash = hashlib.md5(content).hexdigest()
    upload_size = len(content)

    # Validate PDF file structure
    if not content.startswith(b'%PDF-'):
        raise HTTPException(
            status_code=400,
            detail="Invalid PDF file format - missing PDF header"
        )

    # Create job ID
    job_id = str(uuid.uuid4())

    # Save uploaded file to temporary location
    temp_dir = Path(tempfile.gettempdir()) / "pdf_uploads"
    temp_dir.mkdir(exist_ok=True)

    temp_file_path = temp_dir / f"upload_{job_id}.pdf"

    try:
        with open(temp_file_path, "wb") as temp_file:
            temp_file.write(content)

        # Verify file integrity after write
        with open(temp_file_path, "rb") as verify_file:
            written_content = verify_file.read()
            written_hash = hashlib.md5(written_content).hexdigest()
            written_size = len(written_content)

        # Upload integrity validation
        if upload_hash != written_hash:
            os.unlink(temp_file_path)
            raise HTTPException(
                status_code=500,
                detail="Upload integrity check failed - checksum mismatch"
            )

        if upload_size != written_size:
            os.unlink(temp_file_path)
            raise HTTPException(
                status_code=500,
                detail=f"Upload integrity check failed - size mismatch ({upload_size} vs {written_size} bytes)"
            )

        # Initialize job tracking with integrity metadata
        conversion_jobs[job_id] = {
            "status": "queued",
            "filename": file.filename,
            "file_size": len(content),
            "upload_hash": upload_hash,
            "verified_size": written_size,
            "integrity_verified": True,
            "created_at": time.time(),
            "progress": 0
        }

        # Start conversion in background
        background_tasks.add_task(
            process_conversion_job,
            job_id=job_id,
            input_file=str(temp_file_path),
            filename=file.filename
        )

        return {
            "success": True,
            "job_id": job_id,
            "message": "PDF conversion started",
            "filename": file.filename,
            "estimated_completion_seconds": 6,
            "integrity_verified": True,
            "upload_size_bytes": upload_size,
            "verified_size_bytes": written_size,
            "status_url": f"/api/conversion/status/{job_id}",
            "download_url": f"/api/conversion/download/{job_id}"
        }

    except Exception as e:
        # Cleanup on error
        if temp_file_path.exists():
            os.unlink(temp_file_path)

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process upload: {str(e)}"
        )

@router.get("/status/{job_id}", response_model=Dict[str, Any])
async def get_conversion_status(job_id: str):
    """
    Get conversion job status and progress

    - **job_id**: Conversion job ID
    """

    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    job = conversion_jobs[job_id]

    # Calculate estimated completion time
    elapsed_time = time.time() - job["created_at"]
    estimated_remaining = max(0, 6 - elapsed_time) if job["status"] == "processing" else 0

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "filename": job["filename"],
        "elapsed_time_seconds": elapsed_time,
        "estimated_remaining_seconds": estimated_remaining,
        "file_size_bytes": job["file_size"],
        "created_at": job["created_at"],
        "error": job.get("error"),
        "output_file": job.get("output_file"),
        "conversion_time": job.get("conversion_time"),
        "within_performance_target": job.get("within_performance_target")
    }

@router.get("/download/{job_id}")
async def download_converted_file(job_id: str):
    """
    Download converted PowerPoint file

    - **job_id**: Conversion job ID
    """

    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    job = conversion_jobs[job_id]

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400,
            detail=f"Job not completed. Current status: {job['status']}"
        )

    output_file = job.get("output_file")
    if not output_file or not Path(output_file).exists():
        raise HTTPException(
            status_code=404,
            detail="Converted file not found"
        )

    # Generate download filename
    original_filename = Path(job["filename"]).stem
    download_filename = f"{original_filename}_converted.pptx"

    return FileResponse(
        path=output_file,
        filename=download_filename,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )

@router.delete("/job/{job_id}")
async def cleanup_conversion_job(job_id: str):
    """
    Cleanup conversion job and associated files

    - **job_id**: Conversion job ID
    """

    if job_id not in conversion_jobs:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    job = conversion_jobs[job_id]

    # Cleanup files
    temp_dir = Path(tempfile.gettempdir())

    # Remove input file
    input_file = temp_dir / "pdf_uploads" / f"upload_{job_id}.pdf"
    if input_file.exists():
        os.unlink(input_file)

    # Remove output file
    output_file = job.get("output_file")
    if output_file and Path(output_file).exists():
        os.unlink(output_file)

    # Remove job tracking
    del conversion_jobs[job_id]

    return {
        "success": True,
        "message": f"Job {job_id} cleanup completed"
    }

@router.get("/jobs")
async def list_conversion_jobs():
    """
    List all conversion jobs (for monitoring/debugging)
    """

    jobs_summary = []
    for job_id, job in conversion_jobs.items():
        jobs_summary.append({
            "job_id": job_id,
            "status": job["status"],
            "filename": job["filename"],
            "created_at": job["created_at"],
            "elapsed_time": time.time() - job["created_at"]
        })

    return {
        "total_jobs": len(jobs_summary),
        "jobs": jobs_summary
    }

async def process_conversion_job(job_id: str, input_file: str, filename: str):
    """
    Background task to process PDF→PPT conversion
    """

    try:
        # Update job status
        conversion_jobs[job_id]["status"] = "processing"
        conversion_jobs[job_id]["progress"] = 10

        # Perform conversion using LibreOffice
        result = await libreoffice_processor.convert_pdf_to_ppt(
            pdf_path=input_file,
            job_id=job_id
        )

        if result["success"]:
            # Update job with success
            conversion_jobs[job_id].update({
                "status": "completed",
                "progress": 100,
                "output_file": result["output_file"],
                "conversion_time": result["conversion_time_seconds"],
                "within_performance_target": result["within_performance_target"],
                "output_size_bytes": result["output_size_bytes"]
            })

            print(f"✅ Conversion job {job_id} completed successfully")

        else:
            # Handle conversion failure
            conversion_jobs[job_id].update({
                "status": "failed",
                "error": result["error"],
                "conversion_time": result.get("conversion_time_seconds")
            })

            print(f"❌ Conversion job {job_id} failed: {result['error']}")

    except Exception as e:
        # Handle unexpected errors
        conversion_jobs[job_id].update({
            "status": "failed",
            "error": f"Unexpected error: {str(e)}"
        })

        print(f"❌ Conversion job {job_id} crashed: {str(e)}")

    finally:
        # Cleanup input file
        try:
            if Path(input_file).exists():
                os.unlink(input_file)
        except:
            pass