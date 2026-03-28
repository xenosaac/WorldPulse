import asyncio
import json
import logging
import uuid
from contextlib import closing
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import db
from services import get_gemini_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/supply-chains")
async def list_supply_chains():
    with closing(db.get_db()) as conn:
        chains = conn.execute("SELECT * FROM supply_chains").fetchall()
        result = []
        for chain in chains:
            chain_dict = dict(chain)
            nodes = conn.execute(
                "SELECT * FROM supply_chain_nodes WHERE chain_id = ? ORDER BY sort_order",
                (chain_dict["id"],),
            ).fetchall()
            chain_dict["nodes"] = [dict(n) for n in nodes]
            result.append(chain_dict)
        return result


class AddNodeRequest(BaseModel):
    name: str = Field(..., max_length=200)


async def geocode_location(name: str) -> dict:
    """Use Gemini to resolve a location name to lat/lng/country."""
    try:
        client = get_gemini_client()
        from google.genai import types

        def _call():
            return client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[f'Return the geographic coordinates for "{name}" as JSON: {{"lat": number, "lng": number, "country": "string", "role": "string description of this place in supply chain context"}}. Be precise. Return ONLY the JSON object.'],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    http_options=types.HttpOptions(timeout=30),
                ),
            )

        response = await asyncio.to_thread(_call)
        if response.text:
            data = json.loads(response.text)
            return {
                "lat": float(data.get("lat", 0)),
                "lng": float(data.get("lng", 0)),
                "country": data.get("country", ""),
                "role": data.get("role", "custom"),
            }
    except Exception as e:
        logger.warning("Geocode failed for '%s': %s", name, e)
    return {"lat": 0, "lng": 0, "country": "", "role": "custom"}


@router.post("/supply-chains/{chain_id}/nodes")
async def add_node(chain_id: str, req: AddNodeRequest):
    with closing(db.get_db()) as conn:
        chain = conn.execute("SELECT id FROM supply_chains WHERE id = ?", (chain_id,)).fetchone()
        if not chain:
            raise HTTPException(status_code=404, detail="Supply chain not found")

        max_order = conn.execute(
            "SELECT MAX(sort_order) FROM supply_chain_nodes WHERE chain_id = ?", (chain_id,)
        ).fetchone()[0] or 0

    # Geocode the location name using Gemini
    geo = await geocode_location(req.name)

    node_id = f"node-{uuid.uuid4().hex[:8]}"
    with closing(db.get_db()) as conn:
        conn.execute(
            """INSERT INTO supply_chain_nodes (id, chain_id, name, role, lat, lng, country, risk_level, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (node_id, chain_id, req.name, geo["role"], geo["lat"], geo["lng"], geo["country"], "normal", max_order + 1),
        )
        conn.commit()

    return {"id": node_id, "chain_id": chain_id, "name": req.name, "role": geo["role"],
            "lat": geo["lat"], "lng": geo["lng"], "country": geo["country"],
            "risk_level": "normal", "sort_order": max_order + 1}


@router.delete("/supply-chains/nodes/{node_id}")
async def delete_node(node_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute("SELECT id FROM supply_chain_nodes WHERE id = ?", (node_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        conn.execute("DELETE FROM supply_chain_nodes WHERE id = ?", (node_id,))
        conn.commit()
    return {"deleted": node_id}
