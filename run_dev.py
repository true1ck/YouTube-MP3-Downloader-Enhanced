#!/usr/bin/env python3
"""
Development runner with auto-reload enabled.
Use this instead of app.py for development.
"""

import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from app import app
from src.config import Config
from src.utils.logger import get_logger

logger = get_logger(__name__)

if __name__ == "__main__":
    print("🚀 Starting YouTube Tools Pro in DEVELOPMENT MODE")
    print("🔄 Auto-reload is ENABLED - files will auto-update!")
    print("🐛 Debug mode is ON")
    print(f"📂 Serving at: http://127.0.0.1:5000")
    print("⏹️  Press Ctrl+C to stop\n")
    
    try:
        # Force development settings
        os.environ['DEBUG'] = 'true'
        os.environ['FLASK_ENV'] = 'development'
        
        app.run(
            debug=True,
            host="127.0.0.1",  # Localhost only for security
            port=5000,
            use_reloader=True,
            use_debugger=True,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down development server...")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
