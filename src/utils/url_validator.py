import re
from urllib.parse import urlparse
from typing import List, Set

def is_valid_youtube_url(url: str) -> bool:
    """Check if URL is a valid YouTube URL."""
    try:
        parsed = urlparse(url.strip())
        
        # Check for YouTube domains
        youtube_domains = {
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be',
            'www.youtu.be'
        }
        
        if parsed.hostname not in youtube_domains:
            return False
        
        # For youtu.be links
        if parsed.hostname in ('youtu.be', 'www.youtu.be'):
            return bool(parsed.path and len(parsed.path) > 1)
        
        # For youtube.com links
        if parsed.hostname.endswith('youtube.com'):
            # Check for video ID in query params or path
            if 'v=' in parsed.query:
                return True
            
            # Check for shorts or embed URLs
            path_parts = parsed.path.split('/')
            if 'shorts' in path_parts or 'embed' in path_parts:
                return True
        
        return False
        
    except Exception:
        return False

def extract_video_id(url: str) -> str:
    """Extract video ID from YouTube URL."""
    try:
        parsed = urlparse(url.strip())
        
        # Handle youtu.be links
        if parsed.hostname == 'youtu.be':
            return parsed.path[1:].split('/')[0]
        
        # Handle youtube.com links
        if parsed.hostname and 'youtube.com' in parsed.hostname:
            # Check query parameters for v=
            if 'v=' in parsed.query:
                import urllib.parse
                query_params = urllib.parse.parse_qs(parsed.query)
                return query_params.get('v', [''])[0]
            
            # Check path for shorts or embed
            path_parts = parsed.path.split('/')
            if 'shorts' in path_parts:
                idx = path_parts.index('shorts')
                if idx + 1 < len(path_parts):
                    return path_parts[idx + 1]
            
            if 'embed' in path_parts:
                idx = path_parts.index('embed')
                if idx + 1 < len(path_parts):
                    return path_parts[idx + 1]
        
        return ''
    except Exception:
        return ''

def sanitize_urls(urls_text: str) -> List[str]:
    """Extract and validate YouTube URLs from text."""
    # Split by newlines, commas, and spaces
    potential_urls = re.split(r'[\n,\s]+', urls_text.strip())
    
    valid_urls = []
    seen_ids: Set[str] = set()
    
    for url in potential_urls:
        url = url.strip()
        if not url:
            continue
            
        if is_valid_youtube_url(url):
            video_id = extract_video_id(url)
            if video_id and video_id not in seen_ids:
                seen_ids.add(video_id)
                valid_urls.append(url)
    
    return valid_urls

def get_thumbnail_url(url: str, quality: str = 'mqdefault') -> str:
    """Get thumbnail URL for YouTube video."""
    video_id = extract_video_id(url)
    if video_id:
        return f"https://i.ytimg.com/vi/{video_id}/{quality}.jpg"
    return ""
