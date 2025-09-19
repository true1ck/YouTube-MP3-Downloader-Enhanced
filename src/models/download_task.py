from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
import uuid

class DownloadStatus(Enum):
    """Enum for download task statuses."""
    QUEUED = "Queued"
    DOWNLOADING = "Downloading"
    CONVERTING = "Converting"
    TRANSCRIBING = "Transcribing"
    COMPLETED = "Completed"
    FAILED = "Failed"

class DownloadFormat(Enum):
    """Enum for download formats."""
    MP3 = "mp3"
    MP4 = "mp4"

class DownloadTask:
    """Model for a download task."""
    
    def __init__(self, url: str, format_type: DownloadFormat, quality: str = "medium"):
        self.id = str(uuid.uuid4())
        self.url = url
        self.format_type = format_type
        self.quality = quality
        self.status = DownloadStatus.QUEUED
        self.progress = 0.0
        self.speed = ""
        self.eta = ""
        self.title = ""
        self.filename = ""
        self.error_message = ""
        self.transcription = ""
        self.created_at = datetime.now()
        self.completed_at: Optional[datetime] = None
        self.metadata: Dict[str, Any] = {}
    
    def update_progress(self, progress: float, speed: str = "", eta: str = ""):
        """Update download progress."""
        self.progress = round(progress, 2)
        self.speed = speed
        self.eta = eta
    
    def set_status(self, status: DownloadStatus, error_message: str = ""):
        """Update task status."""
        self.status = status
        if error_message:
            self.error_message = error_message
        if status == DownloadStatus.COMPLETED:
            self.completed_at = datetime.now()
    
    def set_metadata(self, title: str = "", filename: str = "", **kwargs):
        """Set task metadata."""
        if title:
            self.title = title
        if filename:
            self.filename = filename
        self.metadata.update(kwargs)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary."""
        return {
            "id": self.id,
            "url": self.url,
            "format": self.format_type.value,
            "quality": self.quality,
            "status": self.status.value,
            "progress": self.progress,
            "speed": self.speed,
            "eta": self.eta,
            "title": self.title,
            "filename": self.filename,
            "error_message": self.error_message,
            "transcription": self.transcription,
            "created_at": self.created_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "metadata": self.metadata
        }
