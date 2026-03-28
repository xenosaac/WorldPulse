import json
from contextlib import closing
import db


def get_fallback(endpoint: str, input_hash: str | None = None) -> dict | None:
    """Query the fallbacks table by endpoint (and optional input_hash) and return parsed JSON response, or None."""
    with closing(db.get_db()) as conn:
        # Try input-specific fallback first
        if input_hash:
            row = conn.execute(
                "SELECT response FROM fallbacks WHERE endpoint = ? AND input_hash = ? LIMIT 1",
                (endpoint, input_hash),
            ).fetchone()
            if row:
                try:
                    return json.loads(row["response"])
                except (json.JSONDecodeError, TypeError):
                    pass

        # Fall back to generic (NULL input_hash) match
        row = conn.execute(
            "SELECT response FROM fallbacks WHERE endpoint = ? AND (input_hash IS NULL OR input_hash = '') LIMIT 1",
            (endpoint,),
        ).fetchone()
        if row is None:
            return None
        try:
            return json.loads(row["response"])
        except (json.JSONDecodeError, TypeError):
            return None
