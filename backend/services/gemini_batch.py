"""Batch Gemini API calls for video analysis, scenario simulation, and brief generation."""

import json
import os
from google import genai
from google.genai import types

# Gemini client (initialized lazily)
_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set in environment")
        _client = genai.Client(api_key=api_key)
    return _client


# ── Video Analysis (batch, pre-demo) ──────────────────────────────────────────
#
# Flow: pre-uploaded video file URI → Gemini 2.0 Flash → structured JSON events
# Each event includes a video_timestamp so the frontend can sync to playback.

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
    client = _get_client()

    response = client.models.generate_content(
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

    try:
        result = json.loads(response.text)
        return result.get("events", [])
    except (json.JSONDecodeError, AttributeError):
        return []


# ── Scenario Simulation (batch with Search grounding) ────────────────────────
#
# Flow: user scenario text + supply chain data → Gemini 2.0 Flash + Google Search
#       → cascading impact analysis per supply chain node

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
    client = _get_client()

    prompt = SCENARIO_PROMPT_TEMPLATE.format(
        supply_chain_json=json.dumps(supply_chain, indent=2),
        scenario_input=scenario_input,
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.4,
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )

    try:
        result = json.loads(response.text)
        return {
            "impact_chain": result.get("impact_chain", []),
            "overall_risk": result.get("overall_risk", "unknown"),
            "executive_summary": result.get("executive_summary", ""),
            "gemini_response": response.text,
        }
    except (json.JSONDecodeError, AttributeError):
        return {
            "impact_chain": [],
            "overall_risk": "unknown",
            "executive_summary": "",
            "gemini_response": None,
        }


# ── Risk Brief Generation (multi-source synthesis) ───────────────────────────
#
# Flow: all events + supply chain + scenario results → Gemini 2.0 Pro
#       → structured professional risk brief

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
    """Generate a comprehensive risk brief using Gemini 2.0 Pro."""
    client = _get_client()

    scenario_section = ""
    if scenario:
        scenario_section = f"SCENARIO ANALYSIS:\n{json.dumps(scenario, indent=2)}"

    prompt = BRIEF_PROMPT_TEMPLATE.format(
        events_json=json.dumps(events, indent=2),
        supply_chain_json=json.dumps(supply_chain, indent=2),
        scenario_section=scenario_section,
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.5,
        ),
    )

    try:
        result = json.loads(response.text)
        return {
            "executive_summary": result.get("executive_summary", ""),
            "risk_matrix": result.get("risk_matrix", []),
            "scenario_analysis": result.get("scenario_analysis", ""),
            "recommendations": result.get("recommendations", []),
            "key_indicators": result.get("key_indicators", []),
            "full_report": result.get("full_report", ""),
        }
    except (json.JSONDecodeError, AttributeError):
        return {
            "executive_summary": "",
            "risk_matrix": [],
            "scenario_analysis": "",
            "recommendations": [],
            "key_indicators": [],
            "full_report": "",
        }
