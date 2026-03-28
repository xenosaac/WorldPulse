"""Pre-demo batch video analysis script.

Usage:
  1. Set GEMINI_API_KEY in .env
  2. Run: python3 analyze_video.py <path_to_video.mp4>

This uploads the video to Gemini Files API, runs batch analysis,
and inserts timestamped events into the database. These events are
then synced to video playback on the frontend during the demo.
"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

import db
from services.gemini_batch import analyze_video, _get_client


async def upload_and_analyze(video_path: str):
    if not os.path.exists(video_path):
        print(f"ERROR: Video file not found: {video_path}")
        sys.exit(1)

    if not os.getenv("GEMINI_API_KEY"):
        print("ERROR: GEMINI_API_KEY not set. Copy .env.example to .env and add your key.")
        sys.exit(1)

    print(f"Uploading video: {video_path}")
    client = _get_client()

    # Upload to Gemini Files API
    uploaded_file = client.files.upload(file=video_path)
    print(f"Uploaded. File URI: {uploaded_file.uri}")
    print(f"File name: {uploaded_file.name}")

    # Wait for processing
    import time
    while uploaded_file.state.name == "PROCESSING":
        print("  Waiting for video processing...")
        time.sleep(5)
        uploaded_file = client.files.get(name=uploaded_file.name)

    if uploaded_file.state.name == "FAILED":
        print(f"ERROR: Video processing failed: {uploaded_file.state}")
        sys.exit(1)

    print(f"Video ready. State: {uploaded_file.state.name}")
    print("Analyzing with Gemini 2.0 Flash...")

    # Run batch analysis
    events = await analyze_video(uploaded_file.uri)

    if not events:
        print("WARNING: No events extracted. Check the video content.")
        return

    print(f"\nExtracted {len(events)} events:")
    for i, evt in enumerate(events, 1):
        ts = evt.get("video_timestamp", "?")
        print(f"  {i}. [{ts}s] {evt.get('title', 'untitled')} ({evt.get('severity', '?')})")

    # Insert into database
    db.init_db()
    conn = db.get_db()

    for evt in events:
        event_id = f"vid-{uuid.uuid4().hex[:8]}"
        conn.execute(
            """INSERT OR REPLACE INTO events
               (id, title, description, lat, lng, severity, affected_sectors,
                source_type, source_url, confidence, evidence, video_timestamp,
                extracted_at, raw_gemini_response)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event_id,
                evt.get("title", "Untitled Event"),
                evt.get("description"),
                evt.get("lat", 0),
                evt.get("lng", 0),
                evt.get("severity", "medium"),
                json.dumps(evt.get("affected_sectors", [])),
                "video",
                None,
                evt.get("confidence"),
                evt.get("evidence"),
                evt.get("video_timestamp"),
                datetime.now(timezone.utc).isoformat(),
                json.dumps(evt),
            ),
        )

    conn.commit()
    conn.close()
    print(f"\nInserted {len(events)} video events into database.")
    print("File URI for frontend config:", uploaded_file.uri)


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_video.py <path_to_video.mp4>")
        print("\nThis script:")
        print("  1. Uploads the video to Gemini Files API")
        print("  2. Analyzes it with Gemini 2.0 Flash")
        print("  3. Extracts timestamped intelligence events")
        print("  4. Inserts them into the database for frontend sync")
        sys.exit(1)

    asyncio.run(upload_and_analyze(sys.argv[1]))


if __name__ == "__main__":
    main()
