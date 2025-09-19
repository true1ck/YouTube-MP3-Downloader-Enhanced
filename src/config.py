import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration class."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Download settings
    DOWNLOAD_FOLDER = os.environ.get('DOWNLOAD_FOLDER', 'downloads')
    MAX_CONCURRENT_DOWNLOADS = int(os.environ.get('MAX_CONCURRENT_DOWNLOADS', '4'))
    
    # FFmpeg settings
    FFMPEG_LOCATION = os.environ.get('FFMPEG_LOCATION')
    
    # Audio quality settings
    AUDIO_QUALITY_OPTIONS = {
        'high': '320',
        'medium': '192',
        'low': '128'
    }
    
    # Video quality settings
    VIDEO_QUALITY_OPTIONS = {
        'best': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best[height<=1080]',
        '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
        '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best[height<=480]'
    }
    
    # Transcription settings
    WHISPER_MODEL = os.environ.get('WHISPER_MODEL', 'base')
    ENABLE_TRANSCRIPTION = os.environ.get('ENABLE_TRANSCRIPTION', 'true').lower() == 'true'
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.path.join('logs', 'app.log')
    
    # Rate limiting
    MAX_URLS_PER_REQUEST = int(os.environ.get('MAX_URLS_PER_REQUEST', '10'))
    
    @staticmethod
    def init_app(app):
        """Initialize application with config."""
        os.makedirs(Config.DOWNLOAD_FOLDER, exist_ok=True)
        os.makedirs('logs', exist_ok=True)
