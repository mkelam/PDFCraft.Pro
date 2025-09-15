"""
Data models for PDF processing operations
Defines job status, processing options, and results
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
import time

class JobStatus(Enum):
    """Processing job status enumeration"""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class ProcessingOptions:
    """Configuration options for PDF processing operations"""
    operation: str = "optimize"  # merge, split, compress, convert, optimize
    output_format: Optional[str] = None  # pdf, jpg, png, docx
    page_range: Optional[str] = None  # "1-5", "1,3,5", "all"
    page_count: Optional[int] = None  # Estimated page count for progress calculation
    quality: Optional[str] = "medium"  # low, medium, high, maximum
    compression_level: Optional[int] = None  # 1-9 for compression operations
    require_enterprise_compliance: bool = False  # Use PDFium for compliance
    preserve_metadata: bool = True
    optimize_for_web: bool = False
    password_protection: Optional[str] = None
    watermark_text: Optional[str] = None
    merge_files: Optional[List[str]] = None  # For merge operations
    split_options: Optional[Dict[str, Any]] = None  # For split operations

@dataclass
class ProcessingResult:
    """Result of PDF processing operation"""
    success: bool
    output_path: Optional[str] = None
    pages_processed: int = 0
    operation_performed: str = ""
    engine_used: str = ""
    size_reduction_bytes: Optional[int] = None
    quality_score: Optional[float] = None  # 0.0-1.0
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ProcessingJob:
    """Complete processing job with status and metrics"""
    id: str
    filename: str
    file_path: str
    options: ProcessingOptions
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0  # 0-100
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    processing_time_ms: Optional[float] = None
    estimated_completion: Optional[float] = None
    file_size_bytes: int = 0
    result: Optional[ProcessingResult] = None
    error: Optional[str] = None

    def __post_init__(self):
        """Calculate estimated completion time based on progress"""
        if self.started_at and self.progress > 0:
            elapsed = time.time() - self.started_at
            estimated_total = (elapsed / self.progress) * 100
            self.estimated_completion = self.started_at + estimated_total

@dataclass
class PerformanceMetrics:
    """System performance metrics for monitoring"""
    total_jobs_processed: int = 0
    average_processing_time_ms: float = 0.0
    success_rate: float = 0.0
    peak_concurrent_jobs: int = 0
    total_pages_processed: int = 0
    average_pages_per_second: float = 0.0
    engine_usage_stats: Dict[str, int] = field(default_factory=dict)
    size_reduction_stats: Dict[str, float] = field(default_factory=dict)

@dataclass
class SystemCapabilities:
    """System capabilities and feature availability"""
    mupdf_available: bool = False
    pdfium_available: bool = False
    max_concurrent_jobs: int = 10
    max_file_size_mb: int = 100
    supported_input_formats: List[str] = field(default_factory=lambda: ["pdf", "docx"])
    supported_output_formats: List[str] = field(default_factory=lambda: ["pdf", "jpg", "png", "docx"])
    supported_operations: List[str] = field(default_factory=lambda: ["merge", "split", "compress", "convert", "optimize"])
    enterprise_compliance_available: bool = False
    ai_features_available: bool = False