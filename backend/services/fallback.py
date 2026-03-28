import json
import db


def get_fallback(endpoint: str) -> dict | None:
    """Query the fallbacks table by endpoint and return parsed JSON response, or None."""
    conn = db.get_db()
    row = conn.execute(
        "SELECT response FROM fallbacks WHERE endpoint = ? LIMIT 1", (endpoint,)
    ).fetchone()
    conn.close()
    if row is None:
        return None
    try:
        return json.loads(row["response"])
    except (json.JSONDecodeError, TypeError):
        return None
