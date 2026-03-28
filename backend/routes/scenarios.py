from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")


class ScenarioRequest(BaseModel):
    scenario_input: str
    chain_id: str


@router.post("/simulate-scenario")
async def simulate_scenario(req: ScenarioRequest):
    return {
        "status": "stub",
        "message": "TODO: Implement Gemini scenario simulation",
        "scenario_input": req.scenario_input,
        "impact_chain": [],
        "overall_risk": "unknown",
    }
