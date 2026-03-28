"""Scenario simulation endpoint — Gemini analyzes cascading effects on supply chain."""

import json
import logging
import uuid
from contextlib import closing
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import db
from services import gemini_batch
from services.fallback import get_fallback

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

RISK_LEVELS = ("normal", "elevated", "high", "critical")


def _coerce_risk_level(value) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        normalized = value.strip().lower()
        aliases = {
            "low": "normal",
            "medium": "elevated",
            "moderate": "elevated",
            "severe": "high",
        }
        if normalized in RISK_LEVELS:
            return normalized
        if normalized in aliases:
            return aliases[normalized]
        try:
            value = float(normalized)
        except ValueError:
            return None

    if isinstance(value, (int, float)):
        if value >= 80:
            return "critical"
        if value >= 60:
            return "high"
        if value >= 30:
            return "elevated"
        return "normal"

    return None


def _normalize_impact_chain(raw_impact_chain) -> list[dict]:
    if not isinstance(raw_impact_chain, list):
        return []

    normalized_chain = []
    for item in raw_impact_chain:
        if not isinstance(item, dict):
            continue

        normalized_item = dict(item)
        if "node_name" not in normalized_item:
            normalized_item["node_name"] = (
                normalized_item.get("node")
                or normalized_item.get("name")
                or "Unknown"
            )

        if "cost_change_percent" not in normalized_item and "cost_change" in normalized_item:
            normalized_item["cost_change_percent"] = normalized_item.pop("cost_change")

        risk_level = _coerce_risk_level(normalized_item.get("risk_level"))
        if risk_level is None:
            risk_level = _coerce_risk_level(normalized_item.get("impact_severity"))
        normalized_item["risk_level"] = risk_level or "normal"

        normalized_chain.append(normalized_item)

    return normalized_chain


class ScenarioRequest(BaseModel):
    scenario_input: str = Field(..., max_length=2000)
    chain_id: str = Field(..., max_length=100)


@router.post("/simulate-scenario")
async def simulate_scenario(req: ScenarioRequest):
    # Load supply chain with nodes
    with closing(db.get_db()) as conn:
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

    # Call Gemini, fall back to cached response on failure
    try:
        result = await gemini_batch.simulate_scenario(req.scenario_input, supply_chain)
    except Exception as e:
        logger.warning("Gemini scenario failed, using fallback: %s", e)
        fallback = get_fallback("simulate-scenario", input_hash=req.chain_id)
        if fallback:
            result = fallback
        else:
            raise HTTPException(status_code=502, detail=f"Scenario simulation failed: {e}")

    impact_chain = _normalize_impact_chain(result.get("impact_chain", []))

    # Save to DB
    scenario_id = f"scn-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    with closing(db.get_db()) as conn:
        conn.execute(
            """INSERT INTO scenario_results
               (id, scenario_input, chain_id, impact_chain, overall_risk, gemini_response, source, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                scenario_id,
                req.scenario_input,
                req.chain_id,
                json.dumps(impact_chain),
                result.get("overall_risk", "unknown"),
                result.get("gemini_response"),
                "text",
                now,
            ),
        )
        conn.commit()

    return {
        "id": scenario_id,
        "scenario_input": req.scenario_input,
        "chain_id": req.chain_id,
        "impact_chain": impact_chain,
        "overall_risk": result.get("overall_risk", "unknown"),
        "executive_summary": result.get("executive_summary", ""),
        "source": "text",
        "created_at": now,
    }


@router.get("/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    with closing(db.get_db()) as conn:
        row = conn.execute(
            "SELECT * FROM scenario_results WHERE id = ?", (scenario_id,)
        ).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Scenario not found")
        d = dict(row)
        if d.get("impact_chain") and isinstance(d["impact_chain"], str):
            try:
                d["impact_chain"] = json.loads(d["impact_chain"])
            except (json.JSONDecodeError, ValueError):
                d["impact_chain"] = []
        d["impact_chain"] = _normalize_impact_chain(d.get("impact_chain", []))
        return d
