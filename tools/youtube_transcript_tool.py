import sys
import json
import re
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

def extract_video_id(url):
    """
    Extracts video ID from standard, shortened, shorts, and embed URLs.
    """
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'youtu\.be\/([0-9A-Za-z_-]{11})',
        r'embed\/([0-9A-Za-z_-]{11})',
        r'shorts\/([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def get_transcript(video_id, languages=['en', 'en-US']):
    try:
        # Fetches the transcript with language fallback
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)
        full_text = " ".join([item['text'] for item in transcript_list])
        return {"success": True, "transcript": full_text}
    except TranscriptsDisabled:
        return {"success": False, "error": "Transcripts are disabled for this video."}
    except NoTranscriptFound:
        return {"success": False, "error": f"No English or auto-generated transcript found for video {video_id}."}
    except VideoUnavailable:
        return {"success": False, "error": "The video is private or has been removed."}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"success": False, "error": "No input provided"}))
            sys.exit(1)
            
        args = json.loads(input_data)
        url = args.get("url", "")
        languages = args.get("languages", ['en', 'en-US'])
        
        if not url:
            print(json.dumps({"success": False, "error": "URL parameter is missing"}))
            sys.exit(1)
        
        video_id = extract_video_id(url)
        if not video_id and len(url) == 11:
            # Handle raw IDs
            video_id = url
            
        if not video_id:
            print(json.dumps({"success": False, "error": "Could not parse YouTube Video ID from URL."}))
            sys.exit(1)

        result = get_transcript(video_id, languages=languages)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)