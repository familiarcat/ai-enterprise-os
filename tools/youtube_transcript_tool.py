import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

def get_transcript(video_id):
    try:
        # Fetches the transcript (prefers English)
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        full_text = " ".join([item['text'] for item in transcript_list])
        return {"success": True, "transcript": full_text}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Read JSON from stdin to stay consistent with the Orchestrator's spawn pattern
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({"error": "No input provided"}))
            sys.exit(1)
            
        args = json.loads(input_data)
        url = args.get("url", "")
        
        # Extract Video ID from URL
        if "v=" in url:
            video_id = url.split("v=")[1].split("&")[0]
        else:
            video_id = url.split("/")[-1]
            
        result = get_transcript(video_id)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)