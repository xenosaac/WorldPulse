from fastapi import APIRouter, HTTPException
import db

router = APIRouter(prefix="/api")


@router.get("/events")
async def list_events():
    conn = db.get_db()
    rows = conn.execute("SELECT * FROM events").fetchall()
    conn.close()
    return [dict(row) for row in rows]


@router.get("/events/{event_id}")
async def get_event(event_id: str):
    conn = db.get_db()
    row = conn.execute("SELECT * FROM events WHERE id = ?", (event_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return dict(row)
