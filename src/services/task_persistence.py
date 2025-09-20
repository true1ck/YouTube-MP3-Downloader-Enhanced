import json
import os
from typing import Dict, List, Optional
from datetime import datetime

from ..models.download_task import DownloadTask
from ..utils.logger import get_logger

logger = get_logger(__name__)

class TaskPersistence:
    """Simple JSON-based task persistence to survive server restarts."""
    
    def __init__(self, storage_file: str = "tasks.json"):
        self.storage_file = storage_file
        self.ensure_storage_file()
    
    def ensure_storage_file(self):
        """Create storage file if it doesn't exist."""
        if not os.path.exists(self.storage_file):
            self.save_tasks({})
    
    def save_tasks(self, tasks: Dict[str, DownloadTask]):
        """Save tasks to JSON file."""
        try:
            task_data = {}
            for task_id, task in tasks.items():
                task_dict = task.to_dict()
                # Ensure all datetime objects are serializable
                if 'created_at' in task_dict and task_dict['created_at']:
                    if isinstance(task_dict['created_at'], datetime):
                        task_dict['created_at'] = task_dict['created_at'].isoformat()
                task_data[task_id] = task_dict
            
            with open(self.storage_file, 'w', encoding='utf-8') as f:
                json.dump(task_data, f, indent=2, ensure_ascii=False)
            
        except Exception as e:
            logger.error(f"Failed to save tasks: {e}")
    
    def load_tasks(self) -> Dict[str, DownloadTask]:
        """Load tasks from JSON file."""
        try:
            if not os.path.exists(self.storage_file):
                return {}
            
            with open(self.storage_file, 'r', encoding='utf-8') as f:
                task_data = json.load(f)
            
            tasks = {}
            for task_id, task_dict in task_data.items():
                try:
                    # Convert created_at back to datetime if it's a string
                    if 'created_at' in task_dict and isinstance(task_dict['created_at'], str):
                        task_dict['created_at'] = datetime.fromisoformat(task_dict['created_at'])
                    
                    # Recreate DownloadTask from dict
                    task = DownloadTask.from_dict(task_dict)
                    tasks[task_id] = task
                except Exception as e:
                    logger.warning(f"Failed to load task {task_id}: {e}")
                    continue
            
            logger.info(f"Loaded {len(tasks)} tasks from storage")
            return tasks
            
        except Exception as e:
            logger.error(f"Failed to load tasks: {e}")
            return {}
    
    def cleanup_old_tasks(self, tasks: Dict[str, DownloadTask], max_age_hours: int = 24):
        """Remove old completed tasks from storage."""
        now = datetime.now()
        tasks_to_remove = []
        
        for task_id, task in tasks.items():
            if task.status.value == 'completed' and task.created_at:
                age_hours = (now - task.created_at).total_seconds() / 3600
                if age_hours > max_age_hours:
                    tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del tasks[task_id]
        
        if tasks_to_remove:
            logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks from storage")
            self.save_tasks(tasks)
        
        return tasks
