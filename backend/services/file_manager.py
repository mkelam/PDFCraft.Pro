"""
File Management Service
Handles file uploads, storage, and cleanup
"""

import asyncio
import tempfile
import shutil
from pathlib import Path
from typing import Optional
import hashlib
import time
import os

class FileManagerService:
    """Service for managing uploaded files and processing outputs"""

    def __init__(self):
        self.upload_dir = Path(tempfile.gettempdir()) / "pdf_saas_uploads"
        self.output_dir = Path(tempfile.gettempdir()) / "pdf_saas_outputs"
        self.max_file_age_hours = 24  # Clean up files after 24 hours

    async def initialize(self):
        """Initialize file manager service"""
        # Create directories
        self.upload_dir.mkdir(exist_ok=True)
        self.output_dir.mkdir(exist_ok=True)

        # Start cleanup task
        asyncio.create_task(self._cleanup_task())

        print("📁 File Manager initialized")

    async def save_upload(self, filename: str, content: bytes) -> Path:
        """Save uploaded file and return path"""
        # Generate unique filename to avoid conflicts
        file_hash = hashlib.md5(content).hexdigest()[:8]
        timestamp = int(time.time())
        safe_filename = f"{timestamp}_{file_hash}_{filename}"

        file_path = self.upload_dir / safe_filename

        # Write file
        with open(file_path, 'wb') as f:
            f.write(content)

        return file_path

    async def get_file_path(self, filename: str) -> Optional[Path]:
        """Get path to uploaded file"""
        file_path = self.upload_dir / filename
        return file_path if file_path.exists() else None

    async def save_output(self, job_id: str, content: bytes, extension: str) -> Path:
        """Save processing output file"""
        output_filename = f"output_{job_id}.{extension}"
        output_path = self.output_dir / output_filename

        with open(output_path, 'wb') as f:
            f.write(content)

        return output_path

    async def cleanup_old_files(self):
        """Clean up files older than max_file_age_hours"""
        current_time = time.time()
        cutoff_time = current_time - (self.max_file_age_hours * 3600)

        # Clean upload directory
        for file_path in self.upload_dir.glob("*"):
            if file_path.stat().st_mtime < cutoff_time:
                try:
                    file_path.unlink()
                    print(f"🗑️ Cleaned up old upload: {file_path.name}")
                except Exception as e:
                    print(f"⚠️ Failed to delete {file_path}: {e}")

        # Clean output directory
        for file_path in self.output_dir.glob("*"):
            if file_path.stat().st_mtime < cutoff_time:
                try:
                    file_path.unlink()
                    print(f"🗑️ Cleaned up old output: {file_path.name}")
                except Exception as e:
                    print(f"⚠️ Failed to delete {file_path}: {e}")

    async def _cleanup_task(self):
        """Background task for periodic cleanup"""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                await self.cleanup_old_files()
            except Exception as e:
                print(f"⚠️ Cleanup task error: {e}")

    async def cleanup(self):
        """Clean up all managed files on shutdown"""
        try:
            if self.upload_dir.exists():
                shutil.rmtree(self.upload_dir)
            if self.output_dir.exists():
                shutil.rmtree(self.output_dir)
            print("🧹 File Manager cleanup completed")
        except Exception as e:
            print(f"⚠️ File Manager cleanup error: {e}")