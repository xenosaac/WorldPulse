"""Scenario simulation endpoint — Gemini analyzes cascading effects on supply chain."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

import db
from services import gemini_batch
from services.fallback import get_fallback

router = APIRouter(prefix="/api")


class ScenarioRequest(BaseModel):
    scenario_input: str
    chain_id: str


@router.post("/simulate-scenario")
async def simulate_scenario(req: ScenarioRequest):
    # Load supply chain with nodes
    conn = db.get_db()
    chain_row = conn.execute(
        "SELECT * FROM supply_chains WHERE id = ?", (req.chain_id,)
    ).fetchone()
    if chain_row is None:
        conn.close()
        return {"error": "Supply chain not found", "chain_id": req.chain_id}

    nodes = conn.execute(
        "SELECT * FROM supply_chain_nodes WHERE chain_id = ? ORDER BY sort_order",
        (req.chain_id,),
    ).fetchall()
    conn.close()

    supply_chain = dict(chain_row)
    supply_chain["nodes"] = [dict(n) for n in nodes]

    # Call Gemini, fall back to cached response on failure
    try:
        result = await gemini_batch.simulate_scenario(
            req.scenario_input, supply_chain
        )
    except Exception as e:
        print(f"Gemini scenario failed, using fallback: {e}")
        fallback = get_fallback("simulate-scenario")
        if fallback:
            result = fallback
        else:
            return {"error": "Scenario simulation failed", "detail": str(e)}

    # Save to DB
    scenario_id = f"scn-{uuid.uuid4().hex[:8]}"
    conn = db.get_db()
    conn.execute(
        """INSERT INTO scenario_results
           (id, scenario_input, chain_id, impact_chain, overall_risk, gemini_response, source, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            scenario_id,
            req.scenario_input,
            req.chain_id,
            json.dumps(result.get("impact_chain", [])),
            result.get("overall_risk", "unknown"),
            result.get("gemini_response"),
            "text",
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()

    return {
        "id": scenario_id,
        "scenario_input": req.scenario_input,
        "chain_id": req.chain_id,
        "impact_chain": result.get("impact_chain", []),
        "overall_risk": result.get("overall_risk", "unknown"),
        "executive_summary": result.get("executive_summary", ""),
    }
