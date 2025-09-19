# YouTube Downloader Pro API Documentation

## Base URL
```
http://localhost:5000
```

## Authentication
Currently, no authentication is required.

## Endpoints

### Download Management

#### Start Download
```http
POST /api/download
```

Start a new download task.

**Request Body:**
```json
{
  "urls": "https://youtube.com/watch?v=VIDEO_ID\nhttps://youtu.be/ANOTHER_ID",
  "format": "mp3",
  "quality": "medium",
  "transcription": false
}
```

**Parameters:**
- `urls` (string): YouTube URLs separated by newlines or commas
- `format` (string): Download format - "mp3" or "mp4"
- `quality` (string): Quality setting
  - For MP3: "low", "medium", "high"
  - For MP4: "480p", "720p", "1080p", "best"
- `transcription` (boolean): Enable AI transcription

**Response:**
```json
{
  "status": "started",
  "tasks_created": 2,
  "tasks": [
    {
      "id": "uuid-here",
      "url": "https://youtube.com/watch?v=VIDEO_ID",
      "format": "mp3",
      "quality": "medium",
      "status": "Queued",
      "progress": 0,
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

### Task Management

#### Get All Tasks
```http
GET /api/tasks
```

Retrieve all download tasks.

**Response:**
```json
{
  "tasks": [
    {
      "id": "uuid-here",
      "url": "https://youtube.com/watch?v=VIDEO_ID",
      "format": "mp3",
      "quality": "medium",
      "status": "Completed",
      "progress": 100,
      "title": "Video Title",
      "filename": "video_title_abc123.mp3",
      "created_at": "2024-01-01T00:00:00",
      "completed_at": "2024-01-01T00:05:30",
      "transcription": "Transcription text here..."
    }
  ]
}
```

#### Get Specific Task
```http
GET /api/tasks/{task_id}
```

Retrieve a specific task by ID.

**Response:**
```json
{
  "task": {
    "id": "uuid-here",
    "url": "https://youtube.com/watch?v=VIDEO_ID",
    "format": "mp3",
    "quality": "medium",
    "status": "Downloading",
    "progress": 45.5,
    "speed": "1.2MB/s",
    "eta": "00:02:15",
    "title": "Video Title",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

#### Retry Failed Task
```http
POST /api/tasks/{task_id}/retry
```

Retry a failed download task.

**Response:**
```json
{
  "status": "retry_started"
}
```

#### Cancel Queued Task
```http
POST /api/tasks/{task_id}/cancel
```

Cancel a queued task.

**Response:**
```json
{
  "status": "cancelled"
}
```

#### Remove Task
```http
DELETE /api/tasks/{task_id}/remove
```

Remove a task from the system.

**Response:**
```json
{
  "status": "removed"
}
```

### Progress and Statistics

#### Get Progress Updates
```http
GET /api/progress
```

Get real-time progress updates for active downloads.

**Response:**
```json
{
  "updates": [
    {
      "type": "status_update",
      "task": {
        "id": "uuid-here",
        "status": "Downloading",
        "progress": 67.3,
        "speed": "2.1MB/s",
        "eta": "00:01:24"
      }
    }
  ]
}
```

#### Get Statistics
```http
GET /api/statistics
```

Get download queue statistics.

**Response:**
```json
{
  "statistics": {
    "total": 10,
    "queued": 2,
    "downloading": 1,
    "converting": 1,
    "transcribing": 0,
    "completed": 5,
    "failed": 1
  }
}
```

#### Clear Completed Tasks
```http
POST /api/clear
```

Clear all completed tasks.

**Response:**
```json
{
  "status": "cleared"
}
```

### Utility Endpoints

#### Get Configuration
```http
GET /api/config
```

Get application configuration for the frontend.

**Response:**
```json
{
  "audio_quality_options": {
    "high": "320",
    "medium": "192",
    "low": "128"
  },
  "video_quality_options": ["best", "1080p", "720p", "480p"],
  "max_urls_per_request": 10,
  "transcription_enabled": true,
  "supported_formats": ["mp3", "mp4"]
}
```

#### Get Video Thumbnail
```http
GET /api/thumbnail?url={youtube_url}
```

Get thumbnail URL for a YouTube video.

**Parameters:**
- `url` (query): YouTube video URL

**Response:**
```json
{
  "thumbnail_url": "https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg"
}
```

#### Download File
```http
GET /download/{filename}
```

Download a completed file.

**Parameters:**
- `filename` (path): Name of the downloaded file

**Response:**
File download with appropriate headers.

## Task Status Values

- `Queued` - Task is waiting to be processed
- `Downloading` - Currently downloading from YouTube
- `Converting` - Converting to target format (MP3/MP4)
- `Transcribing` - Generating AI transcription
- `Completed` - Task finished successfully
- `Failed` - Task failed with error

## Error Responses

All endpoints return appropriate HTTP status codes and error messages:

```json
{
  "error": "Error description here"
}
```

**Common Error Codes:**
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (task/resource not found)
- `500` - Internal Server Error

## Rate Limiting

- Maximum 10 URLs per download request (configurable)
- No API rate limiting currently implemented

## WebSocket Support

Not currently supported. Use polling via `/api/progress` for real-time updates.

## Examples

### Python Example
```python
import requests

# Start download
response = requests.post('http://localhost:5000/api/download', json={
    'urls': 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    'format': 'mp3',
    'quality': 'medium',
    'transcription': True
})

task_data = response.json()
task_id = task_data['tasks'][0]['id']

# Poll for progress
while True:
    progress = requests.get('http://localhost:5000/api/progress').json()
    # Process updates...
```

### JavaScript Example
```javascript
// Start download
const response = await fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        urls: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
        format: 'mp4',
        quality: '720p',
        transcription: false
    })
});

const data = await response.json();
console.log('Tasks created:', data.tasks_created);
```

## Notes

- All timestamps are in ISO 8601 format
- File sizes and speeds are in human-readable format
- Progress is reported as percentage (0-100)
- Transcription is only available when Whisper is properly installed
- FFmpeg is required for audio/video processing
