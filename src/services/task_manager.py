import queue
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional, Callable
import time

from ..config import Config
from ..models.download_task import DownloadTask, DownloadStatus, DownloadFormat
from ..services.download_service import DownloadService
from ..services.transcription_service import TranscriptionService
from ..services.task_persistence import TaskPersistence
from ..utils.logger import get_logger

logger = get_logger(__name__)

class TaskManager:
    """Manages download tasks and coordinates between services."""
    
    def __init__(self):
        self.tasks: Dict[str, DownloadTask] = {}
        self.status_queue = queue.Queue()
        self.download_service = DownloadService()
        self.transcription_service = TranscriptionService()
        self.executor = ThreadPoolExecutor(max_workers=Config.MAX_CONCURRENT_DOWNLOADS)
        self.progress_callbacks: List[Callable] = []
        self._lock = threading.Lock()
        self.persistence = TaskPersistence()
        
        # Load existing tasks from storage
        try:
            saved_tasks = self.persistence.load_tasks()
            self.tasks.update(saved_tasks)
            logger.info(f"TaskManager initialized with {len(self.tasks)} existing tasks")
        except Exception as e:
            logger.error(f"Failed to load existing tasks: {e}")
    
    def add_progress_callback(self, callback: Callable):
        """Add a callback function for progress updates."""
        self.progress_callbacks.append(callback)
    
    def _notify_progress(self, task: DownloadTask):
        """Notify all progress callbacks about task updates."""
        # Add to status queue for API polling
        self.status_queue.put({
            "type": "status_update",
            "task": task.to_dict()
        })
        
        # Call registered callbacks
        for callback in self.progress_callbacks:
            try:
                callback(task)
            except Exception as e:
                logger.error(f"Progress callback error: {e}")
        
        # Save tasks after updates
        self._save_tasks()
    
    def _save_tasks(self):
        """Save tasks to persistent storage."""
        try:
            self.persistence.save_tasks(self.tasks)
        except Exception as e:
            logger.error(f"Failed to save tasks: {e}")
    
    def create_task(self, url: str, format_type: DownloadFormat, quality: str = "medium", 
                   enable_transcription: bool = False) -> DownloadTask:
        """Create a new download task."""
        task = DownloadTask(url, format_type, quality)
        task.metadata['enable_transcription'] = enable_transcription
        
        with self._lock:
            self.tasks[task.id] = task
        
        logger.info(f"Created task {task.id} for {url} ({format_type.value}, {quality})")
        self._notify_progress(task)
        self._save_tasks()
        
        return task
    
    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """Get a task by ID."""
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> List[DownloadTask]:
        """Get all tasks."""
        with self._lock:
            return list(self.tasks.values())
    
    def get_tasks_by_status(self, status: DownloadStatus) -> List[DownloadTask]:
        """Get tasks filtered by status."""
        with self._lock:
            return [task for task in self.tasks.values() if task.status == status]
    
    def start_task(self, task_id: str):
        """Start processing a task."""
        task = self.get_task(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return
        
        if task.status != DownloadStatus.QUEUED:
            logger.warning(f"Task {task_id} is not queued (status: {task.status})")
            return
        
        logger.info(f"Starting task {task_id}")
        self.executor.submit(self._process_task, task)
    
    def start_all_queued_tasks(self):
        """Start all queued tasks."""
        queued_tasks = self.get_tasks_by_status(DownloadStatus.QUEUED)
        logger.info(f"Starting {len(queued_tasks)} queued tasks")
        
        for task in queued_tasks:
            self.executor.submit(self._process_task, task)
    
    def _process_task(self, task: DownloadTask):
        """Process a single task through download and optional transcription."""
        try:
            # Download phase
            success = self.download_service.download(task, self._notify_progress)
            
            if not success:
                logger.error(f"Download failed for task {task.id}")
                return
            
            # Transcription phase (if enabled and service available)
            if (task.metadata.get('enable_transcription', False) and 
                self.transcription_service.is_available()):
                
                logger.info(f"Starting transcription for task {task.id}")
                self.transcription_service.transcribe_task(task, self._notify_progress)
            
            # Final notification
            self._notify_progress(task)
            logger.info(f"Task {task.id} completed successfully")
            
        except Exception as e:
            logger.error(f"Task {task.id} processing error: {e}")
            task.set_status(DownloadStatus.FAILED, str(e))
            self._notify_progress(task)
    
    def retry_task(self, task_id: str):
        """Retry a failed task."""
        task = self.get_task(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return
        
        if task.status != DownloadStatus.FAILED:
            logger.warning(f"Task {task_id} is not failed (status: {task.status})")
            return
        
        # Reset task state
        task.set_status(DownloadStatus.QUEUED)
        task.progress = 0.0
        task.speed = ""
        task.eta = ""
        task.error_message = ""
        task.filename = ""
        
        logger.info(f"Retrying task {task_id}")
        self.executor.submit(self._process_task, task)
    
    def cancel_task(self, task_id: str):
        """Cancel a task (if not yet started)."""
        task = self.get_task(task_id)
        if not task:
            logger.error(f"Task {task_id} not found")
            return
        
        if task.status == DownloadStatus.QUEUED:
            task.set_status(DownloadStatus.FAILED, "Cancelled by user")
            self._notify_progress(task)
            logger.info(f"Task {task_id} cancelled")
        else:
            logger.warning(f"Cannot cancel task {task_id} (status: {task.status})")
    
    def remove_task(self, task_id: str):
        """Remove a task from the manager."""
        with self._lock:
            if task_id in self.tasks:
                del self.tasks[task_id]
                logger.info(f"Task {task_id} removed")
                self._save_tasks()
    
    def clear_completed_tasks(self):
        """Remove all completed tasks."""
        with self._lock:
            completed_tasks = [
                task_id for task_id, task in self.tasks.items()
                if task.status == DownloadStatus.COMPLETED
            ]
            
            for task_id in completed_tasks:
                del self.tasks[task_id]
                
            logger.info(f"Cleared {len(completed_tasks)} completed tasks")
            
            if completed_tasks:
                self._save_tasks()
    
    def get_status_updates(self) -> List[dict]:
        """Get all pending status updates."""
        updates = []
        while not self.status_queue.empty():
            try:
                updates.append(self.status_queue.get_nowait())
            except queue.Empty:
                break
        return updates
    
    def get_statistics(self) -> dict:
        """Get task statistics."""
        with self._lock:
            stats = {
                "total": len(self.tasks),
                "queued": 0,
                "downloading": 0,
                "converting": 0,
                "transcribing": 0,
                "completed": 0,
                "failed": 0
            }
            
            for task in self.tasks.values():
                if task.status == DownloadStatus.QUEUED:
                    stats["queued"] += 1
                elif task.status == DownloadStatus.DOWNLOADING:
                    stats["downloading"] += 1
                elif task.status == DownloadStatus.CONVERTING:
                    stats["converting"] += 1
                elif task.status == DownloadStatus.TRANSCRIBING:
                    stats["transcribing"] += 1
                elif task.status == DownloadStatus.COMPLETED:
                    stats["completed"] += 1
                elif task.status == DownloadStatus.FAILED:
                    stats["failed"] += 1
            
            return stats
    
    def shutdown(self):
        """Shutdown the task manager."""
        logger.info("Shutting down task manager")
        self.executor.shutdown(wait=True)
