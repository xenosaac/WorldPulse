"""Gemini Live API session manager for voice interactions.

Architecture:
  Browser mic → WebSocket → FastAPI → Live API session → audio response → WebSocket → browser speaker

The google-genai SDK provides an async context manager:
  async with client.aio.live.connect(model=..., config=...) as session:
      session.send(audio_data)
      response = await session.receive()

This module wraps that into a session manager that handles:
- Session creation with different system instructions per use case
- Audio relay between the FastAPI WebSocket and the Gemini Live API
- Function call handling (e.g. update_supply_chain_risk)
- Graceful shutdown and fallback
"""

import asyncio
import json
import os
from google import genai
from google.genai import types

_client = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set")
        _client = genai.Client(api_key=api_key)
    return _client


# System instructions per session type
SCENARIO_SYSTEM_INSTRUCTION = """You are a senior geopolitical risk analyst at a global intelligence firm.
The user will describe a hypothetical scenario. Analyze its cascading effects on their supply chain.

When you identify an impact on a supply chain node, call the update_supply_chain_risk function
to update the visualization on the user's globe display.

Speak clearly and concisely. Use professional analyst tone. Reference current events where relevant.
After your analysis, provide a brief executive summary."""

BRIEFING_SYSTEM_INSTRUCTION = """You are a senior intelligence analyst delivering a verbal risk briefing.
Narrate a concise executive summary of the current global intelligence picture and its impact
on the user's supply chain. Speak for 60-90 seconds. Professional tone, clear structure.
Highlight the highest-risk areas first, then recommendations."""

# Tools for scenario voice sessions (function calling)
SCENARIO_TOOLS = [
    types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="update_supply_chain_risk",
                description="Update the risk visualization for a supply chain node on the globe",
                parameters=types.Schema(
                    type="OBJECT",
                    properties={
                        "node_name": types.Schema(type="STRING", description="Name of the supply chain node"),
                        "risk_level": types.Schema(
                            type="STRING",
                            description="Risk level",
                            enum=["normal", "elevated", "high", "critical"],
                        ),
                        "impact_description": types.Schema(type="STRING", description="What happens to this node"),
                        "cost_change_percent": types.Schema(type="NUMBER", description="Cost change as percentage"),
                    },
                    required=["node_name", "risk_level", "impact_description"],
                ),
            )
        ]
    ),
    types.Tool(google_search=types.GoogleSearch()),
]


class LiveSessionManager:
    """Manages Gemini Live API sessions for voice relay."""

    async def create_scenario_session(self):
        """Create a Live API session for voice scenario simulation."""
        client = _get_client()
        config = types.LiveConnectConfig(
            system_instruction=SCENARIO_SYSTEM_INSTRUCTION,
            tools=SCENARIO_TOOLS,
            response_modalities=["AUDIO", "TEXT"],
        )
        session = await client.aio.live.connect(
            model="gemini-2.0-flash-live-001",
            config=config,
        )
        return session

    async def create_briefing_session(self, context: str):
        """Create a Live API session for voice-narrated briefing."""
        client = _get_client()
        instruction = BRIEFING_SYSTEM_INSTRUCTION + f"\n\nCONTEXT:\n{context}"
        config = types.LiveConnectConfig(
            system_instruction=instruction,
            response_modalities=["AUDIO", "TEXT"],
        )
        session = await client.aio.live.connect(
            model="gemini-2.0-flash-live-001",
            config=config,
        )
        return session


# Singleton
live_manager = LiveSessionManager()
