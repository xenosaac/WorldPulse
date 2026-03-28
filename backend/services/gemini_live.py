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
import logging
import os
from google import genai
from google.genai import types
from services import get_gemini_client

logger = logging.getLogger(__name__)

LIVE_MODEL = "gemini-3.1-flash-live-preview"


def _instruction_content(text: str) -> types.Content:
    return types.Content(parts=[types.Part(text=text)])


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


class ManagedLiveSession:
    """Wrap the SDK's async context manager as a session with explicit close()."""

    def __init__(self, session_cm):
        self._session_cm = session_cm
        self._session = None

    @classmethod
    async def open(cls, session_cm):
        managed = cls(session_cm)
        managed._session = await session_cm.__aenter__()
        return managed

    async def send(self, *args, **kwargs):
        return await self._session.send(*args, **kwargs)

    async def send_client_content(self, *args, **kwargs):
        return await self._session.send_client_content(*args, **kwargs)

    async def send_realtime_input(self, *args, **kwargs):
        return await self._session.send_realtime_input(*args, **kwargs)

    async def send_tool_response(self, *args, **kwargs):
        return await self._session.send_tool_response(*args, **kwargs)

    def receive(self):
        return self._session.receive()

    async def close(self):
        if self._session_cm is None:
            return
        await self._session_cm.__aexit__(None, None, None)
        self._session_cm = None
        self._session = None


class LiveSessionManager:
    """Manages Gemini Live API sessions for voice relay."""

    async def create_scenario_session(self, context: str = ""):
        """Create a Live API session for voice scenario simulation."""
        client = get_gemini_client()
        instruction = SCENARIO_SYSTEM_INSTRUCTION
        if context:
            instruction = f"{instruction}\n\nWORLD PULSE CONTEXT:\n{context}"
        config = {
            "system_instruction": _instruction_content(instruction),
            "tools": SCENARIO_TOOLS,
            "response_modalities": ["AUDIO"],
            "input_audio_transcription": {},
            "output_audio_transcription": {},
        }
        session_cm = client.aio.live.connect(
            model=LIVE_MODEL,
            config=config,
        )
        return await ManagedLiveSession.open(session_cm)

    async def create_briefing_session(self, context: str):
        """Create a Live API session for voice-narrated briefing."""
        client = get_gemini_client()
        instruction = BRIEFING_SYSTEM_INSTRUCTION
        if context:
            instruction = f"{instruction}\n\nWORLD PULSE CONTEXT:\n{context}"
        config = {
            "system_instruction": _instruction_content(instruction),
            "response_modalities": ["AUDIO"],
            "output_audio_transcription": {},
        }
        session_cm = client.aio.live.connect(
            model=LIVE_MODEL,
            config=config,
        )
        return await ManagedLiveSession.open(session_cm)


# Singleton
live_manager = LiveSessionManager()
