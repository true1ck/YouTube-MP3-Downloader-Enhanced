import os
import sys

# Add src to path so we can import our modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from flask import Flask, render_template, request, jsonify, send_from_directory

from src.config import Config
from src.models.download_task import DownloadFormat, DownloadStatus
from src.services.task_manager import TaskManager
from src.utils.logger import setup_logging, get_logger
from src.utils.url_validator import sanitize_urls

# Setup logging
setup_logging()
logger = get_logger(__name__)

# Create Flask app
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config.from_object(Config)

# Initialize configuration
Config.init_app(app)

# Initialize task manager
task_manager = TaskManager()

@app.route("/")
def index():
    """Main page with modular interface."""
    return render_template("index.html")

@app.route("/api/download", methods=["POST"])
def start_download():
    """Start download with enhanced options."""
    try:
        data = request.get_json()
        if not data:
            data = request.form.to_dict()
        
        urls_text = data.get("urls", "")
        format_type = data.get("format", "mp3").lower()
        quality = data.get("quality", "medium")
        enable_transcription = data.get("transcription", False)
        
        # Validate format
        try:
            download_format = DownloadFormat(format_type)
        except ValueError:
            return jsonify({"error": "Invalid format. Use 'mp3' or 'mp4'"}), 400
        
        # Sanitize and validate URLs
        urls = sanitize_urls(urls_text)
        
        if not urls:
            return jsonify({"error": "No valid YouTube URLs found"}), 400
        
        if len(urls) > Config.MAX_URLS_PER_REQUEST:
            return jsonify({
                "error": f"Too many URLs. Maximum {Config.MAX_URLS_PER_REQUEST} allowed"
            }), 400
        
        # Create tasks
        created_tasks = []
        for url in urls:
            # Check if task already exists for this URL
            existing_tasks = [
                task for task in task_manager.get_all_tasks()
                if task.url == url and task.status != DownloadStatus.FAILED
            ]
            
            if existing_tasks:
                logger.info(f"Task already exists for URL: {url}")
                continue
            
            task = task_manager.create_task(
                url=url,
                format_type=download_format,
                quality=quality,
                enable_transcription=enable_transcription
            )
            created_tasks.append(task.to_dict())
        
        if not created_tasks:
            return jsonify({"error": "All URLs are already in the queue"}), 400
        
        # Start processing
        task_manager.start_all_queued_tasks()
        
        return jsonify({
            "status": "started",
            "tasks_created": len(created_tasks),
            "tasks": created_tasks
        })
        
    except Exception as e:
        logger.error(f"Download start error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks")
def get_tasks():
    """Get all tasks."""
    try:
        tasks = [task.to_dict() for task in task_manager.get_all_tasks()]
        return jsonify({"tasks": tasks})
    except Exception as e:
        logger.error(f"Get tasks error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<task_id>")
def get_task(task_id):
    """Get specific task."""
    try:
        task = task_manager.get_task(task_id)
        if not task:
            return jsonify({"error": "Task not found"}), 404
        
        return jsonify({"task": task.to_dict()})
    except Exception as e:
        logger.error(f"Get task error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<task_id>/retry", methods=["POST"])
def retry_task(task_id):
    """Retry a failed task."""
    try:
        task_manager.retry_task(task_id)
        return jsonify({"status": "retry_started"})
    except Exception as e:
        logger.error(f"Retry task error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<task_id>/cancel", methods=["POST"])
def cancel_task(task_id):
    """Cancel a queued task."""
    try:
        task_manager.cancel_task(task_id)
        return jsonify({"status": "cancelled"})
    except Exception as e:
        logger.error(f"Cancel task error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/tasks/<task_id>/remove", methods=["DELETE"])
def remove_task(task_id):
    """Remove a task."""
    try:
        task_manager.remove_task(task_id)
        return jsonify({"status": "removed"})
    except Exception as e:
        logger.error(f"Remove task error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/progress")
def get_progress():
    """Get progress updates."""
    try:
        updates = task_manager.get_status_updates()
        return jsonify({"updates": updates})
    except Exception as e:
        logger.error(f"Get progress error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/statistics")
def get_statistics():
    """Get task statistics."""
    try:
        stats = task_manager.get_statistics()
        return jsonify({"statistics": stats})
    except Exception as e:
        logger.error(f"Get statistics error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/clear", methods=["POST"])
def clear_completed():
    """Clear completed tasks."""
    try:
        task_manager.clear_completed_tasks()
        return jsonify({"status": "cleared"})
    except Exception as e:
        logger.error(f"Clear completed error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/download/<path:filename>")
def download_file(filename):
    """Download completed files."""
    try:
        return send_from_directory(Config.DOWNLOAD_FOLDER, filename, as_attachment=True)
    except Exception as e:
        logger.error(f"Download file error: {e}")
        return jsonify({"error": "File not found"}), 404

@app.route("/api/config")
def get_config():
    """Get application configuration for frontend."""
    return jsonify({
        "audio_quality_options": Config.AUDIO_QUALITY_OPTIONS,
        "video_quality_options": list(Config.VIDEO_QUALITY_OPTIONS.keys()),
        "max_urls_per_request": Config.MAX_URLS_PER_REQUEST,
        "transcription_enabled": Config.ENABLE_TRANSCRIPTION and task_manager.transcription_service.is_available(),
        "supported_formats": ["mp3", "mp4"]
    })

# Error handlers
@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad request"}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    try:
        logger.info("Starting YouTube Downloader Pro...")
        logger.info(f"Download folder: {Config.DOWNLOAD_FOLDER}")
        logger.info(f"FFmpeg available: {task_manager.download_service.ffmpeg_location is not None}")
        logger.info(f"Aria2c available: {task_manager.download_service.aria2c_available}")
        logger.info(f"Transcription available: {task_manager.transcription_service.is_available()}")
        
        # Run the app with auto-reload for development
        app.run(
            debug=True,  # Force debug mode for development
            host="0.0.0.0",
            port=5000,
            threaded=True,
            use_reloader=True,  # Enable auto-reload
            use_debugger=True   # Enable debugger
        )
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        task_manager.shutdown()
