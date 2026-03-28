import json
import logging
import uuid
from contextlib import closing
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import db
from services import gemini_batch
from services.fallback import get_fallback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


def _parse_event(row) -> dict:
    """Convert a DB row to a dict, parsing JSON fields."""
    d = dict(row)
    if d.get("affected_sectors") and isinstance(d["affected_sectors"], str):
        try:
            d["affected_sectors"] = json.loads(d["affected_sectors"])
        except (json.JSONDecodeError, ValueError):
            d["affected_sectors"] = []
    return d


@router.get("/events")
async def list_events():
    with closing(db.get_db()) as conn:
        rows = conn.execute("SELECT * FROM events").fetchall()
        return [_parse_event(row) for row in rows]


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Event not found")
        return _parse_event(row)


class VideoAnalyzeRequest(BaseModel):
    file_uri: str | None = Field(None, max_length=500)
    url: str | None = Field(None, max_length=500)


@router.post("/analyze-video")
async def analyze_video(req: VideoAnalyzeRequest):
    video_source = req.url or req.file_uri
    if not video_source:
        raise HTTPException(status_code=400, detail="Provide either 'url' (YouTube) or 'file_uri' (GCS)")
    try:
        result = await gemini_batch.analyze_video(video_source)
        events = result if isinstance(result, list) else result.get("events", [])
    except Exception as e:
        logger.warning("Gemini video analysis failed, using fallback: %s", e)
        fallback = get_fallback("analyze-video")
        if fallback:
            events = fallback.get("events", [])
        else:
            raise HTTPException(status_code=502, detail=f"Video analysis failed: {e}")

    inserted = []
    with closing(db.get_db()) as conn:
        for evt in events:
            event_id = f"vid-{uuid.uuid4().hex[:8]}"
            sectors = evt.get("affected_sectors", [])
            now = datetime.now(timezone.utc).isoformat()
            conn.execute(
                """INSERT OR REPLACE INTO events
                   (id, title, description, lat, lng, severity, affected_sectors,
                    source_type, source_url, confidence, evidence, video_timestamp,
                    extracted_at, raw_gemini_response)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    event_id, evt.get("title", "Untitled"), evt.get("description"),
                    evt.get("lat", 0), evt.get("lng", 0), evt.get("severity", "medium"),
                    json.dumps(sectors), "video", None, evt.get("confidence"),
                    evt.get("evidence"), evt.get("video_timestamp"),
                    now, json.dumps(evt),
                ),
            )
            inserted.append({
                "id": event_id,
                "title": evt.get("title", "Untitled"),
                "description": evt.get("description"),
                "lat": evt.get("lat", 0),
                "lng": evt.get("lng", 0),
                "severity": evt.get("severity", "medium"),
                "affected_sectors": sectors,
                "source_type": "video",
                "source_url": None,
                "confidence": evt.get("confidence"),
                "evidence": evt.get("evidence"),
                "video_timestamp": evt.get("video_timestamp"),
                "extracted_at": now,
            })
        conn.commit()

    return {"events": inserted}
