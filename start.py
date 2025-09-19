#!/usr/bin/env python3
"""
YouTube Downloader Pro Launcher
Simple launcher script to start the application with proper setup.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Error: Python 3.8 or higher is required")
        print(f"   Current version: {sys.version}")
        sys.exit(1)
    print(f"✅ Python version: {sys.version_info.major}.{sys.version_info.minor}")

def check_ffmpeg():
    """Check if FFmpeg is available."""
    try:
        subprocess.run(['ffmpeg', '-version'], 
                      stdout=subprocess.DEVNULL, 
                      stderr=subprocess.DEVNULL, 
                      check=True)
        print("✅ FFmpeg is available")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  FFmpeg not found - audio/video processing may not work")
        print("   Install FFmpeg from: https://ffmpeg.org/download.html")
        return False

def check_dependencies():
    """Check if required Python packages are installed."""
    required_packages = [
        'flask',
        'yt-dlp',
        'python-dotenv',
        'requests'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("   Install with: pip install -r requirements.txt")
        return False
    
    print("✅ All required packages are installed")
    return True

def setup_directories():
    """Create necessary directories."""
    directories = ['downloads', 'logs']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Directory ready: {directory}/")

def main():
    """Main launcher function."""
    print("🎬 YouTube Downloader Pro Launcher")
    print("=" * 50)
    
    # Change to script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # System checks
    print("\n🔍 System Checks:")
    check_python_version()
    
    if not check_dependencies():
        print("\n💡 To install dependencies:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    
    check_ffmpeg()
    
    # Setup
    print("\n⚙️  Setup:")
    setup_directories()
    
    # Check for environment file
    if not Path('.env').exists():
        if Path('.env.example').exists():
            print("ℹ️  Consider copying .env.example to .env for configuration")
    
    print("\n🚀 Starting YouTube Downloader Pro...")
    print("   Access at: http://localhost:5000")
    print("   Press Ctrl+C to stop\n")
    
    # Start the application
    try:
        if Path('app.py').exists():
            subprocess.run([sys.executable, 'app.py'])
        else:
            print("❌ No application file found (app.py)")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 YouTube Downloader Pro stopped")
    except Exception as e:
        print(f"❌ Error starting application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
