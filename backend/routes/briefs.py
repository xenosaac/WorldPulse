from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api")


class BriefRequest(BaseModel):
    chain_id: str
    scenario_id: Optional[str] = None


@router.post("/generate-brief")
async def generate_brief(req: BriefRequest):
    return {
        "status": "stub",
        "message": "TODO: Implement Gemini risk brief generation",
        "executive_summary": "",
        "risk_matrix": [],
        "recommendations": [],
    }
