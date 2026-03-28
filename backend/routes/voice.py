"""WebSocket endpoint for Live API voice relay.

Protocol (single WS, typed JSON envelope):

Client → Server:
  {type: "audio", data: "<base64 PCM audio chunk>"}
  {type: "start_scenario", chain_id: "..."}
  {type: "start_briefing", chain_id: "...", scenario_id: "..."}
  {type: "stop"}

Server → Client:
  {type: "audio", data: "<base64 audio chunk>"}
  {type: "tool_call", name: "update_supply_chain_risk", args: {...}}
  {type: "transcript", text: "..."}
  {type: "session", status: "connected|active|complete|error"}
"""

import asyncio
import base64
import json
import traceback

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import db
from services.gemini_live import live_manager

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()
    await _send(websocket, {"type": "session", "status": "connected"})

    session = None
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "start_scenario":
                await _send(websocket, {"type": "session", "status": "connecting"})
                try:
                    session = await live_manager.create_scenario_session()
                    await _send(websocket, {"type": "session", "status": "active"})
                    # Start receiving from Gemini in background
                    asyncio.create_task(_receive_loop(websocket, session))
                except Exception as e:
                    await _send(websocket, {
                        "type": "session", "status": "error",
                        "message": f"Live API connection failed: {e}",
                    })

            elif msg_type == "start_briefing":
                await _send(websocket, {"type": "session", "status": "connecting"})
                # Build context from DB for the briefing
                context = _build_briefing_context(
                    msg.get("chain_id"), msg.get("scenario_id")
                )
                try:
                    session = await live_manager.create_briefing_session(context)
                    await _send(websocket, {"type": "session", "status": "active"})
                    # Send initial prompt to start the briefing
                    await session.send(input="Please deliver the risk briefing now.", end_of_turn=True)
                    asyncio.create_task(_receive_loop(websocket, session))
                except Exception as e:
                    await _send(websocket, {
                        "type": "session", "status": "error",
                        "message": f"Live API connection failed: {e}",
                    })

            elif msg_type == "audio" and session:
                # Relay audio from browser to Gemini
                audio_bytes = base64.b64decode(msg["data"])
                await session.send(input=audio_bytes)

            elif msg_type == "stop":
                if session:
                    await session.close()
                    session = None
                await _send(websocket, {"type": "session", "status": "complete"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        traceback.print_exc()
        try:
            await _send(websocket, {"type": "session", "status": "error", "message": str(e)})
        except Exception:
            pass
    finally:
        if session:
            try:
                await session.close()
            except Exception:
                pass


async def _receive_loop(websocket: WebSocket, session):
    """Background task: receive from Gemini Live API, forward to browser."""
    try:
        async for response in session.receive():
            # Handle audio responses
            if hasattr(response, "data") and response.data:
                audio_b64 = base64.b64encode(response.data).decode()
                await _send(websocket, {"type": "audio", "data": audio_b64})

            # Handle text responses
            if hasattr(response, "text") and response.text:
                await _send(websocket, {"type": "transcript", "text": response.text})

            # Handle function calls
            if hasattr(response, "tool_call") and response.tool_call:
                tc = response.tool_call
                await _send(websocket, {
                    "type": "tool_call",
                    "name": tc.name,
                    "args": json.loads(tc.args) if isinstance(tc.args, str) else tc.args,
                })

    except Exception as e:
        await _send(websocket, {
            "type": "session", "status": "error",
            "message": f"Live API stream ended: {e}",
        })


async def _send(ws: WebSocket, data: dict):
    """Send typed JSON message to the browser."""
    await ws.send_text(json.dumps(data))


def _build_briefing_context(chain_id: str | None, scenario_id: str | None) -> str:
    """Build context string from DB for the briefing session."""
    conn = db.get_db()
    parts = []

    # Events
    events = conn.execute("SELECT title, description, severity, lat, lng FROM events").fetchall()
    if events:
        parts.append("CURRENT EVENTS:")
        for e in events:
            parts.append(f"- [{dict(e)['severity'].upper()}] {dict(e)['title']}: {dict(e)['description']}")

    # Supply chain
    if chain_id:
        nodes = conn.execute(
            "SELECT name, role, country, risk_level FROM supply_chain_nodes WHERE chain_id = ? ORDER BY sort_order",
            (chain_id,),
        ).fetchall()
        if nodes:
            parts.append("\nSUPPLY CHAIN:")
            for n in nodes:
                d = dict(n)
                parts.append(f"- {d['name']} ({d['role']}, {d['country']}) - Risk: {d['risk_level']}")

    # Scenario
    if scenario_id:
        scn = conn.execute(
            "SELECT scenario_input, impact_chain, overall_risk FROM scenario_results WHERE id = ?",
            (scenario_id,),
        ).fetchone()
        if scn:
            d = dict(scn)
            parts.append(f"\nSCENARIO: {d['scenario_input']}")
            parts.append(f"Overall Risk: {d['overall_risk']}")

    conn.close()
    return "\n".join(parts)
