"""Batch Gemini API calls for video analysis, scenario simulation, and brief generation.

All calls use asyncio.to_thread() to avoid blocking the FastAPI event loop.
On parse failure, GeminiParseError is raised so route handlers trigger fallback.
"""

import asyncio
import json
import logging
import os
from google import genai
from google.genai import types
from services import get_gemini_client

logger = logging.getLogger(__name__)


class GeminiParseError(Exception):
    """Raised when Gemini returns unparseable or empty results."""
    pass


def _validate_event(evt: dict) -> dict:
    """Validate and clamp an event dict from Gemini output."""
    severity = str(evt.get("severity", "medium")).lower()
    if severity not in ("low", "medium", "high", "critical"):
        severity = "medium"
    confidence = evt.get("confidence")
    if confidence is not None:
        confidence = max(0, min(100, float(confidence)))
    lat = float(evt.get("lat", 0))
    lng = float(evt.get("lng", 0))
    lat = max(-90, min(90, lat))
    lng = max(-180, min(180, lng))
    sectors = evt.get("affected_sectors", [])
    if isinstance(sectors, str):
        sectors = [sectors]
    return {
        **evt,
        "severity": severity,
        "confidence": confidence,
        "lat": lat,
        "lng": lng,
        "affected_sectors": sectors,
    }


# ── Video Analysis (batch, pre-demo) ──────────────────────────────────────────

VIDEO_ANALYSIS_PROMPT = """You are a geopolitical intelligence analyst. Analyze this news video carefully.

Extract discrete intelligence events as structured JSON. For each event provide:
- title: concise event title
- description: 1-2 sentence description
- lat: latitude of the event location
- lng: longitude of the event location
- severity: one of "low", "medium", "high", "critical"
- confidence: 0-100 confidence score
- evidence: what visual/audio evidence led to this extraction
- affected_sectors: array of affected sectors (e.g. "semiconductors", "shipping", "energy")
- video_timestamp: approximate seconds into the video when this event is discussed

Return a JSON object with a single key "events" containing an array of event objects.
Be specific about geographic locations. Extract 3-7 events from typical news footage."""


async def analyze_video(file_uri: str) -> list[dict]:
    """Analyze a video file using Gemini 2.0 Flash. Returns extracted events with timestamps."""
    client = get_gemini_client()

    def _call():
        return client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Part.from_uri(file_uri=file_uri, mime_type="video/mp4"),
                VIDEO_ANALYSIS_PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

    response = await asyncio.to_thread(_call)

    if not response.text:
        raise GeminiParseError("Gemini returned empty response for video analysis")

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError as e:
        raise GeminiParseError(f"Gemini returned invalid JSON: {e}")

    events = result.get("events", [])
    if not events:
        raise GeminiParseError("Gemini returned zero events from video")

    return [_validate_event(e) for e in events]


# ── Scenario Simulation (batch with Search grounding) ────────────────────────

SCENARIO_PROMPT_TEMPLATE = """You are a geopolitical risk analyst with access to current information via Google Search.

Given the supply chain below and a hypothetical scenario, analyze the cascading effects.

SUPPLY CHAIN:
{supply_chain_json}

SCENARIO: {scenario_input}

For each supply chain node, analyze:
- impact_severity: 0-100 (how badly this node is affected)
- impact_description: what happens to this node
- timeline: when the impact hits (e.g. "immediate", "1-2 weeks", "1-3 months")
- alternative_options: what alternatives exist
- cost_change_percent: estimated cost increase/decrease as a percentage

Also provide:
- overall_risk: one of "low", "medium", "high", "critical"
- executive_summary: 2-3 sentence summary of the overall impact

Return as JSON with keys: "impact_chain" (array of node impacts), "overall_risk", "executive_summary"."""


async def simulate_scenario(scenario_input: str, supply_chain: dict) -> dict:
    """Run a scenario simulation using Gemini 2.0 Flash with Google Search grounding."""
    client = get_gemini_client()

    prompt = SCENARIO_PROMPT_TEMPLATE.format(
        supply_chain_json=json.dumps(supply_chain, indent=2),
        scenario_input=scenario_input,
    )

    def _call():
        return client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

    response = await asyncio.to_thread(_call)

    if not response.text:
        raise GeminiParseError("Gemini returned empty response for scenario")

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError as e:
        raise GeminiParseError(f"Gemini returned invalid JSON: {e}")

    overall_risk = str(result.get("overall_risk", "unknown")).lower()
    if overall_risk not in ("low", "medium", "high", "critical"):
        overall_risk = "unknown"

    return {
        "impact_chain": result.get("impact_chain", []),
        "overall_risk": overall_risk,
        "executive_summary": result.get("executive_summary", ""),
        "gemini_response": response.text,
    }


# ── Risk Brief Generation (multi-source synthesis) ───────────────────────────

BRIEF_PROMPT_TEMPLATE = """You are a senior intelligence analyst producing a professional supply chain risk brief.

Synthesize all provided intelligence into a structured report.

GLOBAL EVENTS:
{events_json}

SUPPLY CHAIN:
{supply_chain_json}

{scenario_section}

Produce a risk brief with these sections:
1. Executive Summary (2 paragraphs)
2. Risk Matrix (for each supply chain node: node name, risk level, primary threat, mitigation recommendation)
3. Scenario Analysis (if scenario provided: cascading effects with timeline)
4. Mitigation Recommendations (prioritized list of 5-7 actions)
5. Key Indicators to Watch (3-5 metrics/events to monitor going forward)

Write in professional analyst tone. Return as JSON with keys:
"executive_summary", "risk_matrix" (array of objects), "scenario_analysis", "recommendations" (array of strings), "key_indicators" (array of strings), "full_report" (complete markdown-formatted report)."""


async def generate_brief(
    events: list, supply_chain: dict, scenario: dict | None = None
) -> dict:
    """Generate a comprehensive risk brief using Gemini 2.0 Flash."""
    client = get_gemini_client()

    scenario_section = ""
    if scenario:
        scenario_section = f"SCENARIO ANALYSIS:\n{json.dumps(scenario, indent=2)}"

    prompt = BRIEF_PROMPT_TEMPLATE.format(
        events_json=json.dumps(events, indent=2),
        supply_chain_json=json.dumps(supply_chain, indent=2),
        scenario_section=scenario_section,
    )

    def _call():
        return client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.5,
            ),
        )

    response = await asyncio.to_thread(_call)

    if not response.text:
        raise GeminiParseError("Gemini returned empty response for brief")

    try:
        result = json.loads(response.text)
    except json.JSONDecodeError as e:
        raise GeminiParseError(f"Gemini returned invalid JSON: {e}")

    return {
        "executive_summary": result.get("executive_summary", ""),
        "risk_matrix": result.get("risk_matrix", []),
        "scenario_analysis": result.get("scenario_analysis", ""),
        "recommendations": result.get("recommendations", []),
        "key_indicators": result.get("key_indicators", []),
        "full_report": result.get("full_report", ""),
    }
