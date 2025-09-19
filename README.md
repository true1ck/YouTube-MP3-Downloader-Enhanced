# YouTube Downloader Pro 🎬

**A modern, professional YouTube audio/video downloader with AI-powered transcription capabilities**

![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
![Flask](https://img.shields.io/badge/flask-v3.0+-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

### Core Functionality
- 🎵 **MP3 Audio Downloads** - High-quality audio extraction (128kbps - 320kbps)
- 🎬 **MP4 Video Downloads** - Multiple quality options (480p - 1080p + Best)
- 🤖 **AI Transcription** - Automatic speech-to-text using OpenAI Whisper
- 📱 **Modern Web UI** - Responsive design with dark/light theme
- 🚀 **Concurrent Downloads** - Process multiple downloads simultaneously
- 📊 **Real-time Progress** - Live download progress with speed and ETA

### Professional Features
- 🏗️ **Clean Architecture** - Modular design with services and models
- 📝 **Comprehensive Logging** - Detailed logs for debugging and monitoring
- ⚙️ **Configurable** - Environment-based configuration
- 🔄 **Auto-retry** - Failed download retry mechanism
- 📈 **Statistics Dashboard** - Download queue statistics
- 🎨 **Professional UI** - Modern Bootstrap 5 interface

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- FFmpeg (for audio/video processing)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Yt_MP3_Downloader-
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install FFmpeg** (Required for audio/video processing)
   
   **Windows:**
   - Download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Extract and add to PATH, or set `FFMPEG_LOCATION` environment variable
   
   **macOS:**
   ```bash
   brew install ffmpeg
   ```
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```

5. **Configure environment** (optional)
   ```bash
   cp .env.example .env
   # Edit .env with your preferred settings
   ```

6. **Run the application**
   ```bash
   python app.py
   # or use the launcher:
   python start.py
   ```

7. **Open in browser**
   ```
   http://localhost:5000
   ```

## 🎯 Usage

### Basic Download
1. Paste YouTube URLs in the text area (one per line or comma-separated)
2. Select format (MP3 or MP4) and quality
3. Optionally enable AI transcription
4. Click "Start Download"

### Supported URLs
- Standard YouTube: `https://youtube.com/watch?v=VIDEO_ID`
- YouTube Shorts: `https://youtube.com/shorts/VIDEO_ID`
- Short URLs: `https://youtu.be/VIDEO_ID`
- Embedded URLs: `https://youtube.com/embed/VIDEO_ID`

### Quality Options

**Audio (MP3):**
- High: 320kbps
- Medium: 192kbps
- Low: 128kbps

**Video (MP4):**
- Best: Highest available quality
- 1080p: Full HD
- 720p: HD
- 480p: Standard Definition

## 🏗️ Architecture

```
src/
├── config.py              # Application configuration
├── models/
│   └── download_task.py    # Task data models
├── services/
│   ├── download_service.py # Download logic
│   ├── transcription_service.py # AI transcription
│   └── task_manager.py     # Task coordination
└── utils/
    ├── logger.py           # Logging utilities
    └── url_validator.py    # URL validation

static/
├── style.css              # Modern UI styles
└── script.js              # Modular JavaScript

templates/
└── index.html             # Modular interface
```

## 📡 API Endpoints

### Core Endpoints
- `POST /api/download` - Start new download
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/{id}` - Get specific task
- `GET /api/progress` - Get progress updates
- `GET /api/statistics` - Get download statistics

### Task Management
- `POST /api/tasks/{id}/retry` - Retry failed task
- `POST /api/tasks/{id}/cancel` - Cancel queued task
- `DELETE /api/tasks/{id}/remove` - Remove task
- `POST /api/clear` - Clear completed tasks

### Utility Endpoints
- `GET /api/config` - Get app configuration
- `GET /api/thumbnail?url={url}` - Get video thumbnail
- `GET /download/{filename}` - Download completed file

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | `dev-secret-key` | Flask secret key |
| `DEBUG` | `False` | Enable debug mode |
| `DOWNLOAD_FOLDER` | `downloads` | Download directory |
| `MAX_CONCURRENT_DOWNLOADS` | `4` | Max parallel downloads |
| `MAX_URLS_PER_REQUEST` | `10` | Max URLs per request |
| `FFMPEG_LOCATION` | Auto-detect | FFmpeg binary path |
| `ENABLE_TRANSCRIPTION` | `True` | Enable AI transcription |
| `WHISPER_MODEL` | `base` | Whisper model size |
| `LOG_LEVEL` | `INFO` | Logging level |

### Whisper Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `tiny` | 39 MB | Fastest | Good |
| `base` | 74 MB | Fast | Better |
| `small` | 244 MB | Medium | Good |
| `medium` | 769 MB | Slow | Better |
| `large` | 1550 MB | Slowest | Best |

## 🔧 Development

### Project Structure
```bash
# Install development dependencies
pip install -r requirements.txt

# Run in development mode
export DEBUG=true
python app_new.py

# Run tests (if implemented)
python -m pytest tests/
```

### Adding New Features
1. Create service in `src/services/`
2. Add models to `src/models/`
3. Update configuration in `src/config.py`
4. Add API endpoints to `app_new.py`
5. Update frontend in `static/` and `templates/`

## 🐛 Troubleshooting

### Common Issues

**FFmpeg not found:**
```bash
# Install FFmpeg or set environment variable
export FFMPEG_LOCATION=/path/to/ffmpeg/bin
```

**Transcription not working:**
```bash
# Install torch for your system
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
```

**Downloads failing:**
- Check internet connection
- Verify YouTube URL is accessible
- Check logs in `logs/app.log`

**Permission errors:**
- Ensure write permissions for downloads folder
- Run with appropriate user permissions

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
export DEBUG=true
python app_new.py
```

## 📊 Performance

### Recommended System Requirements
- **RAM:** 2GB+ (4GB+ with transcription)
- **Storage:** 1GB+ free space
- **CPU:** Multi-core recommended for concurrent downloads
- **Network:** Stable internet connection

### Optimization Tips
- Adjust `MAX_CONCURRENT_DOWNLOADS` based on system capabilities
- Use `aria2c` for faster downloads (auto-detected)
- Choose smaller Whisper models for faster transcription

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - YouTube downloading engine
- [OpenAI Whisper](https://github.com/openai/whisper) - AI transcription
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [Bootstrap 5](https://getbootstrap.com/) - UI framework

## 🔮 Roadmap

- [ ] Playlist support
- [ ] Batch transcription
- [ ] Custom output formats
- [ ] Download scheduling
- [ ] User authentication
- [ ] API rate limiting
- [ ] Download history persistence
- [ ] Mobile app

---

**Made with ❤️ using Flask, yt-dlp, and OpenAI Whisper**
