"""WebSocket endpoint for Live API voice relay.

Protocol (single WS, typed JSON envelope):

Client -> Server:
  {type: "audio", data: "<base64 PCM audio chunk>"}
  {type: "start_scenario", chain_id: "..."}
  {type: "start_briefing", chain_id: "...", scenario_id: "..."}
  {type: "stop"}

Server -> Client:
  {type: "audio", data: "<base64 audio chunk>"}
  {type: "tool_call", name: "update_supply_chain_risk", args: {...}}
  {type: "transcript", text: "..."}
  {type: "session", status: "connected|active|complete|error"}
"""

import asyncio
import base64
import json
import traceback
from contextlib import closing

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types

import db
from services.gemini_live import live_manager

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()
    await _send(websocket, {"type": "session", "status": "connected"})

    session = None
    receive_task = None

    async def _cleanup_session():
        """Close current session and cancel receive task."""
        nonlocal session, receive_task
        if receive_task and not receive_task.done():
            receive_task.cancel()
            try:
                await receive_task
            except (asyncio.CancelledError, Exception):
                pass
            receive_task = None
        if session:
            try:
                await session.close()
            except Exception:
                pass
            session = None

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await _send(websocket, {"type": "session", "status": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "start_scenario":
                await _cleanup_session()
                await _send(websocket, {"type": "session", "status": "connecting"})
                context = _build_live_context(msg.get("chain_id"), None)
                try:
                    session = await live_manager.create_scenario_session(context)
                    await _send(websocket, {"type": "session", "status": "active"})
                    receive_task = asyncio.create_task(_receive_loop(websocket, session))
                except Exception as e:
                    await _send(websocket, {
                        "type": "session", "status": "error",
                        "message": f"Live API connection failed: {e}",
                    })

            elif msg_type == "start_briefing":
                await _cleanup_session()
                await _send(websocket, {"type": "session", "status": "connecting"})
                context = _build_live_context(
                    msg.get("chain_id"), msg.get("scenario_id")
                )
                try:
                    session = await live_manager.create_briefing_session(context)
                    await _send(websocket, {"type": "session", "status": "active"})
                    await session.send_client_content(
                        turns=types.Content(
                            role="user",
                            parts=[types.Part(text="Please deliver the risk briefing now.")],
                        )
                    )
                    receive_task = asyncio.create_task(_receive_loop(websocket, session))
                except Exception as e:
                    await _send(websocket, {
                        "type": "session", "status": "error",
                        "message": f"Live API connection failed: {e}",
                    })

            elif msg_type == "audio" and session:
                data = msg.get("data", "")
                if not data or len(data) > 1_000_000:
                    continue
                try:
                    audio_bytes = base64.b64decode(data)
                    await session.send_realtime_input(
                        audio=types.Blob(data=audio_bytes, mime_type="audio/webm"),
                    )
                except Exception:
                    pass

            elif msg_type == "stop":
                await _cleanup_session()
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
        await _cleanup_session()


async def _receive_loop(websocket: WebSocket, session):
    """Background task: receive from Gemini Live API, forward to browser."""
    try:
        async for response in session.receive():
            server_content = getattr(response, "server_content", None)
            if server_content:
                model_turn = getattr(server_content, "model_turn", None)
                if model_turn and getattr(model_turn, "parts", None):
                    for part in model_turn.parts:
                        inline_data = getattr(part, "inline_data", None)
                        if inline_data and getattr(inline_data, "data", None):
                            audio_b64 = base64.b64encode(inline_data.data).decode()
                            await _send(websocket, {"type": "audio", "data": audio_b64})

                        text = getattr(part, "text", None)
                        if text:
                            await _send(websocket, {"type": "transcript", "text": text})

                for transcript_attr in ("input_transcription", "output_transcription"):
                    transcript = getattr(server_content, transcript_attr, None)
                    text = getattr(transcript, "text", None)
                    if text:
                        await _send(websocket, {"type": "transcript", "text": text})

            tool_call = getattr(response, "tool_call", None)
            function_calls = getattr(tool_call, "function_calls", None) if tool_call else None
            if function_calls:
                function_responses = []
                for call in function_calls:
                    call_name = getattr(call, "name", None)
                    call_id = getattr(call, "id", None) or call_name
                    raw_args = getattr(call, "args", None)
                    if not call_name:
                        continue
                    try:
                        args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args if isinstance(raw_args, dict) else {})
                    except (json.JSONDecodeError, TypeError):
                        args = {"raw": str(raw_args)}
                    await _send(websocket, {
                        "type": "tool_call",
                        "name": call_name,
                        "args": args,
                    })
                    function_responses.append(
                        types.FunctionResponse(
                            id=call_id,
                            name=call_name,
                            response={"status": "ok"},
                        )
                    )

                await session.send_tool_response(function_responses=function_responses)

    except asyncio.CancelledError:
        return
    except Exception:
        try:
            await _send(websocket, {
                "type": "session", "status": "error",
                "message": "Live API stream ended",
            })
        except Exception:
            pass


async def _send(ws: WebSocket, data: dict):
    """Send typed JSON message to the browser."""
    await ws.send_text(json.dumps(data))


def _build_live_context(chain_id: str | None, scenario_id: str | None) -> str:
    """Build a context string from DB for live voice sessions."""
    with closing(db.get_db()) as conn:
        parts = []

        events = conn.execute("SELECT title, description, severity FROM events").fetchall()
        if events:
            parts.append("CURRENT EVENTS:")
            for e in events:
                d = dict(e)
                parts.append(f"- [{d['severity'].upper()}] {d['title']}: {d['description']}")

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

        if scenario_id:
            scn = conn.execute(
                "SELECT scenario_input, overall_risk FROM scenario_results WHERE id = ?",
                (scenario_id,),
            ).fetchone()
            if scn:
                d = dict(scn)
                parts.append(f"\nSCENARIO: {d['scenario_input']}")
                parts.append(f"Overall Risk: {d['overall_risk']}")

        return "\n".join(parts)
