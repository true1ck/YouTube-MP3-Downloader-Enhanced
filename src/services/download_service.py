import os
import re
import shutil
import traceback
from typing import Optional, Callable
import yt_dlp

from ..config import Config
from ..models.download_task import DownloadTask, DownloadStatus, DownloadFormat
from ..utils.logger import get_logger

logger = get_logger(__name__)

class DownloadService:
    """Service for handling YouTube downloads."""
    
    def __init__(self):
        self.ffmpeg_location = self._detect_ffmpeg_location()
        self.aria2c_available = bool(shutil.which("aria2c"))
    
    def _detect_ffmpeg_location(self) -> Optional[str]:
        """Detect ffmpeg location."""
        # Check environment variable first
        env_loc = Config.FFMPEG_LOCATION
        if env_loc and os.path.exists(env_loc):
            return env_loc
        
        # Look on PATH
        ffmpeg_path = shutil.which("ffmpeg")
        ffprobe_path = shutil.which("ffprobe")
        if ffmpeg_path and ffprobe_path:
            return os.path.dirname(ffmpeg_path)
        
        return None
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename for safe storage."""
        if not filename:
            return "yt_download"
        return re.sub(r'[\\/*?:"<>|]', "_", filename)
    
    def _make_progress_hook(self, task: DownloadTask, progress_callback: Optional[Callable] = None):
        """Create a progress hook for yt-dlp."""
        def progress_hook(d):
            try:
                status = d.get("status")
                if status == "downloading":
                    # Parse percentage
                    percent = 0.0
                    pstr = d.get("_percent_str") or d.get("percent") or "0"
                    try:
                        cleaned = re.sub(r"[^0-9.]", "", str(pstr))
                        percent = float(cleaned) if cleaned else 0.0
                    except Exception:
                        percent = 0.0
                    
                    speed = (d.get("_speed_str") or d.get("speed") or "").strip()
                    eta = (d.get("_eta_str") or d.get("eta") or "").strip()
                    
                    task.update_progress(percent, speed, eta)
                    task.set_status(DownloadStatus.DOWNLOADING)
                    
                    if progress_callback:
                        progress_callback(task)
                        
                elif status == "finished":
                    filename = d.get("filename")
                    if filename and not filename.lower().endswith(f".{task.format_type.value}"):
                        task.set_status(DownloadStatus.CONVERTING)
                        if progress_callback:
                            progress_callback(task)
                            
            except Exception as e:
                logger.error(f"Progress hook error for task {task.id}: {e}")
                task.set_status(DownloadStatus.FAILED, str(e))
                if progress_callback:
                    progress_callback(task)
                    
        return progress_hook
    
    def _get_ydl_opts(self, task: DownloadTask) -> dict:
        """Get yt-dlp options based on task format and quality."""
        unique_id = task.id[:8]
        out_template = os.path.join(Config.DOWNLOAD_FOLDER, f"%(title)s_{unique_id}.%(ext)s")
        
        base_opts = {
            "outtmpl": out_template,
            "noplaylist": True,
            "continuedl": True,
            "quiet": True,
            "no_warnings": True,
        }
        
        if task.format_type == DownloadFormat.MP3:
            # Audio download options
            quality = Config.AUDIO_QUALITY_OPTIONS.get(task.quality, "192")
            base_opts.update({
                "format": "bestaudio/best",
                "postprocessors": [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": quality,
                }]
            })
        elif task.format_type == DownloadFormat.MP4:
            # Video download options
            format_selector = Config.VIDEO_QUALITY_OPTIONS.get(task.quality, "best")
            base_opts.update({
                "format": format_selector,
                "merge_output_format": "mp4"
            })
        
        # Add aria2c if available
        if self.aria2c_available:
            base_opts.update({
                "external_downloader": "aria2c",
                "external_downloader_args": ["-x16", "-s16", "-k1M"],
            })
        
        # Add ffmpeg location if available
        if self.ffmpeg_location:
            base_opts["ffmpeg_location"] = self.ffmpeg_location
            
        return base_opts
    
    def download(self, task: DownloadTask, progress_callback: Optional[Callable] = None) -> bool:
        """Download content based on task configuration."""
        try:
            logger.info(f"Starting download for task {task.id}: {task.url}")
            task.set_status(DownloadStatus.DOWNLOADING)
            
            if progress_callback:
                progress_callback(task)
            
            ydl_opts = self._get_ydl_opts(task)
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # Add progress hook
                ydl.add_progress_hook(self._make_progress_hook(task, progress_callback))
                
                # Extract info first to get metadata
                info = ydl.extract_info(task.url, download=False)
                title = info.get("title", "Unknown")
                task.set_metadata(title=title)
                
                if progress_callback:
                    progress_callback(task)
                
                # Now download
                info = ydl.extract_info(task.url, download=True)
                
                # Determine final filename
                try:
                    filename_with_ext = ydl.prepare_filename(info)
                    base_filename, _ = os.path.splitext(filename_with_ext)
                    final_filename = f"{base_filename}.{task.format_type.value}"
                    final_basename = os.path.basename(final_filename)
                    
                    if os.path.exists(final_filename):
                        task.set_metadata(filename=final_basename)
                        task.set_status(DownloadStatus.COMPLETED)
                        task.update_progress(100.0)
                        
                        logger.info(f"Download completed for task {task.id}: {final_basename}")
                        
                        if progress_callback:
                            progress_callback(task)
                            
                        return True
                    else:
                        raise FileNotFoundError("Output file not found after download")
                        
                except Exception as e:
                    # Fallback filename generation
                    safe_title = self._sanitize_filename(title)
                    final_basename = f"{safe_title}_{task.id[:8]}.{task.format_type.value}"
                    
                    # Check if file exists with different naming
                    for file in os.listdir(Config.DOWNLOAD_FOLDER):
                        if task.id[:8] in file and file.endswith(f".{task.format_type.value}"):
                            task.set_metadata(filename=file)
                            task.set_status(DownloadStatus.COMPLETED)
                            task.update_progress(100.0)
                            
                            logger.info(f"Download completed for task {task.id}: {file}")
                            
                            if progress_callback:
                                progress_callback(task)
                                
                            return True
                    
                    raise e
                    
        except Exception as e:
            logger.error(f"Download failed for task {task.id}: {e}")
            error_msg = str(e)
            
            # Provide helpful error messages
            if "ffprobe and ffmpeg not found" in error_msg or "ffmpeg" in error_msg.lower():
                error_msg = ("Postprocessing failed: ffmpeg not found. "
                           "Install ffmpeg (https://ffmpeg.org/) or set FFMPEG_LOCATION environment variable.")
            
            task.set_status(DownloadStatus.FAILED, error_msg)
            
            if progress_callback:
                progress_callback(task)
                
            return False
