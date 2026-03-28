"""Risk brief generation endpoint — Gemini synthesizes all intelligence into a report."""

import json
import logging
import uuid
from contextlib import closing
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

import db
from services import gemini_batch
from services.fallback import get_fallback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


class BriefRequest(BaseModel):
    chain_id: str = Field(..., max_length=100)
    scenario_id: Optional[str] = Field(None, max_length=100)


@router.post("/generate-brief")
async def generate_brief(req: BriefRequest):
    with closing(db.get_db()) as conn:
        # Load all events
        events = [dict(r) for r in conn.execute("SELECT * FROM events").fetchall()]

        # Load supply chain with nodes
        chain_row = conn.execute(
            "SELECT * FROM supply_chains WHERE id = ?", (req.chain_id,)
        ).fetchone()
        if chain_row is None:
            raise HTTPException(status_code=404, detail="Supply chain not found")

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
                    try:
                        scenario["impact_chain"] = json.loads(scenario["impact_chain"])
                    except (json.JSONDecodeError, ValueError):
                        scenario["impact_chain"] = []

    # Call Gemini, fall back to cached response on failure
    try:
        result = await gemini_batch.generate_brief(events, supply_chain, scenario)
    except Exception as e:
        logger.warning("Gemini brief failed, using fallback: %s", e)
        fallback = get_fallback(
            "generate-brief",
            input_hash=req.chain_id,
            allow_generic=False,
        )
        if fallback:
            result = fallback
        else:
            raise HTTPException(status_code=502, detail=f"Brief generation failed: {e}")

    # Save to DB
    brief_id = f"brief-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    with closing(db.get_db()) as conn:
        conn.execute(
            """INSERT INTO risk_briefs
               (id, chain_id, scenario_id, executive_summary, risk_matrix, scenario_analysis, recommendations, key_indicators, full_report, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                brief_id,
                req.chain_id,
                req.scenario_id,
                result.get("executive_summary", ""),
                json.dumps(result.get("risk_matrix", [])),
                result.get("scenario_analysis", ""),
                json.dumps(result.get("recommendations", [])),
                json.dumps(result.get("key_indicators", [])),
                result.get("full_report", ""),
                now,
            ),
        )
        conn.commit()

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
        "created_at": now,
    }


@router.get("/briefs/{brief_id}")
async def get_brief(brief_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute(
            "SELECT * FROM risk_briefs WHERE id = ?", (brief_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Brief not found")
        d = dict(row)
        for field in ("risk_matrix", "recommendations", "key_indicators"):
            if d.get(field) and isinstance(d[field], str):
                try:
                    d[field] = json.loads(d[field])
                except (json.JSONDecodeError, ValueError):
                    d[field] = []
        return d
