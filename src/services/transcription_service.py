import os
import tempfile
from typing import Optional, Callable

from ..config import Config
from ..models.download_task import DownloadTask, DownloadStatus
from ..utils.logger import get_logger

logger = get_logger(__name__)

class TranscriptionService:
    """Service for transcribing audio content using Whisper."""
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load Whisper model lazily."""
        if not Config.ENABLE_TRANSCRIPTION:
            logger.info("Transcription is disabled")
            return
        
        try:
            import whisper
            self.model = whisper.load_model(Config.WHISPER_MODEL)
            logger.info(f"Whisper model '{Config.WHISPER_MODEL}' loaded successfully")
        except ImportError:
            logger.error("Whisper not available. Install with: pip install openai-whisper")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {e}")
    
    def is_available(self) -> bool:
        """Check if transcription is available."""
        return self.model is not None and Config.ENABLE_TRANSCRIPTION
    
    def transcribe_file(self, file_path: str, task: DownloadTask, progress_callback: Optional[Callable] = None) -> Optional[str]:
        """Transcribe an audio file."""
        if not self.is_available():
            logger.warning("Transcription not available")
            return None
        
        if not os.path.exists(file_path):
            logger.error(f"File not found for transcription: {file_path}")
            return None
        
        try:
            logger.info(f"Starting transcription for task {task.id}: {file_path}")
            task.set_status(DownloadStatus.TRANSCRIBING)
            
            if progress_callback:
                progress_callback(task)
            
            # For MP4 files, we might need to extract audio first
            audio_file = file_path
            temp_audio = None
            
            if file_path.lower().endswith('.mp4'):
                temp_audio = self._extract_audio_from_video(file_path)
                if temp_audio:
                    audio_file = temp_audio
                else:
                    logger.error("Failed to extract audio from video")
                    return None
            
            # Transcribe the audio
            result = self.model.transcribe(audio_file)
            transcription = result["text"].strip()
            
            # Clean up temporary file
            if temp_audio and os.path.exists(temp_audio):
                os.remove(temp_audio)
            
            logger.info(f"Transcription completed for task {task.id}")
            return transcription
            
        except Exception as e:
            logger.error(f"Transcription failed for task {task.id}: {e}")
            return None
    
    def _extract_audio_from_video(self, video_path: str) -> Optional[str]:
        """Extract audio from video file for transcription."""
        try:
            import subprocess
            
            # Create temporary audio file
            temp_dir = tempfile.gettempdir()
            temp_audio = os.path.join(temp_dir, f"temp_audio_{os.path.basename(video_path)}.wav")
            
            # Use ffmpeg to extract audio
            cmd = [
                "ffmpeg",
                "-i", video_path,
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # Audio codec
                "-ar", "16000",  # Sample rate
                "-ac", "1",  # Mono
                "-y",  # Overwrite output file
                temp_audio
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0 and os.path.exists(temp_audio):
                return temp_audio
            else:
                logger.error(f"FFmpeg error: {result.stderr}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to extract audio from video: {e}")
            return None
    
    def transcribe_task(self, task: DownloadTask, progress_callback: Optional[Callable] = None) -> bool:
        """Transcribe a completed download task."""
        if not task.filename or task.status != DownloadStatus.COMPLETED:
            logger.warning(f"Task {task.id} is not ready for transcription")
            return False
        
        file_path = os.path.join(Config.DOWNLOAD_FOLDER, task.filename)
        transcription = self.transcribe_file(file_path, task, progress_callback)
        
        if transcription:
            task.transcription = transcription
            logger.info(f"Transcription saved for task {task.id}")
            
            if progress_callback:
                progress_callback(task)
                
            return True
        
        return False
