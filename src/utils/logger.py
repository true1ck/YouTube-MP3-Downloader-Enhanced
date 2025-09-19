import logging
import os
from logging.handlers import RotatingFileHandler

from ..config import Config

def setup_logging():
    """Set up logging configuration."""
    # Create logs directory
    os.makedirs(os.path.dirname(Config.LOG_FILE), exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, Config.LOG_LEVEL),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler(
                Config.LOG_FILE,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()
        ]
    )

def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)
