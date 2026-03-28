from contextlib import closing
from fastapi import APIRouter, HTTPException
import db

router = APIRouter(prefix="/api")


@router.get("/events")
async def list_events():
    with closing(db.get_db()) as conn:
        rows = conn.execute("SELECT * FROM events").fetchall()
        return [dict(row) for row in rows]


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Event not found")
        return dict(row)
