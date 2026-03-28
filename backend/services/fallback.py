import json
from contextlib import closing
import db


def get_fallback(endpoint: str) -> dict | None:
    """Query the fallbacks table by endpoint and return parsed JSON response, or None."""
    with closing(db.get_db()) as conn:
        row = conn.execute(
            "SELECT response FROM fallbacks WHERE endpoint = ? LIMIT 1", (endpoint,)
        ).fetchone()
        if row is None:
            return None
        try:
            return json.loads(row["response"])
        except (json.JSONDecodeError, TypeError):
            return None
