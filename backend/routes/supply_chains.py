import uuid
from contextlib import closing
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
import db

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
    role: str = Field("custom", max_length=100)
    lat: float = Field(0.0)
    lng: float = Field(0.0)
    country: Optional[str] = Field(None, max_length=100)
    risk_level: str = Field("normal", max_length=20)


@router.post("/supply-chains/{chain_id}/nodes")
async def add_node(chain_id: str, req: AddNodeRequest):
    with closing(db.get_db()) as conn:
        chain = conn.execute("SELECT id FROM supply_chains WHERE id = ?", (chain_id,)).fetchone()
        if not chain:
            raise HTTPException(status_code=404, detail="Supply chain not found")

        max_order = conn.execute(
            "SELECT MAX(sort_order) FROM supply_chain_nodes WHERE chain_id = ?", (chain_id,)
        ).fetchone()[0] or 0

        node_id = f"node-{uuid.uuid4().hex[:8]}"
        conn.execute(
            """INSERT INTO supply_chain_nodes (id, chain_id, name, role, lat, lng, country, risk_level, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (node_id, chain_id, req.name, req.role, req.lat, req.lng, req.country, req.risk_level, max_order + 1),
        )
        conn.commit()

    return {"id": node_id, "chain_id": chain_id, "name": req.name, "role": req.role,
            "lat": req.lat, "lng": req.lng, "country": req.country,
            "risk_level": req.risk_level, "sort_order": max_order + 1}


@router.delete("/supply-chains/nodes/{node_id}")
async def delete_node(node_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute("SELECT id FROM supply_chain_nodes WHERE id = ?", (node_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Node not found")
        conn.execute("DELETE FROM supply_chain_nodes WHERE id = ?", (node_id,))
        conn.commit()
    return {"deleted": node_id}
