"""Risk brief generation endpoint — Gemini synthesizes all intelligence into a report."""

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

import db
from services import gemini_batch
from services.fallback import get_fallback

router = APIRouter(prefix="/api")


class BriefRequest(BaseModel):
    chain_id: str
    scenario_id: Optional[str] = None


@router.post("/generate-brief")
async def generate_brief(req: BriefRequest):
    conn = db.get_db()

    # Load all events
    events = [
        dict(r) for r in conn.execute("SELECT * FROM events").fetchall()
    ]

    # Load supply chain with nodes
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

    supply_chain = dict(chain_row)
    supply_chain["nodes"] = [dict(n) for n in nodes]

    # Load scenario if provided
    scenario = None
    if req.scenario_id:
        scn_row = conn.execute(
            "SELECT * FROM scenario_results WHERE id = ?", (req.scenario_id,)
        ).fetchone()
        if scn_row:
            scenario = dict(scn_row)
            if scenario.get("impact_chain") and isinstance(scenario["impact_chain"], str):
                scenario["impact_chain"] = json.loads(scenario["impact_chain"])

    conn.close()

    # Call Gemini, fall back to cached response on failure
    try:
        result = await gemini_batch.generate_brief(events, supply_chain, scenario)
    except Exception as e:
        print(f"Gemini brief failed, using fallback: {e}")
        fallback = get_fallback("generate-brief")
        if fallback:
            result = fallback
        else:
            return {"error": "Brief generation failed", "detail": str(e)}

    # Save to DB
    brief_id = f"brief-{uuid.uuid4().hex[:8]}"
    conn = db.get_db()
    conn.execute(
        """INSERT INTO risk_briefs
           (id, chain_id, scenario_id, executive_summary, risk_matrix, recommendations, full_report, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            brief_id,
            req.chain_id,
            req.scenario_id,
            result.get("executive_summary", ""),
            json.dumps(result.get("risk_matrix", [])),
            json.dumps(result.get("recommendations", [])),
            result.get("full_report", ""),
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()
    conn.close()

    return {
        "id": brief_id,
        "chain_id": req.chain_id,
        "scenario_id": req.scenario_id,
        "executive_summary": result.get("executive_summary", ""),
        "risk_matrix": result.get("risk_matrix", []),
        "scenario_analysis": result.get("scenario_analysis", ""),
        "recommendations": result.get("recommendations", []),
        "key_indicators": result.get("key_indicators", []),
        "full_report": result.get("full_report", ""),
    }
