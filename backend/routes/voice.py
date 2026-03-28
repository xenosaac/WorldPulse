import json
from fastapi import APIRouter, WebSocket

router = APIRouter()


@router.websocket("/ws/voice")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text(
        json.dumps({"type": "session", "status": "connected"})
    )
    await websocket.send_text(
        json.dumps(
            {
                "type": "session",
                "status": "stub",
                "message": "TODO: Implement Live API voice relay",
            }
        )
    )
    await websocket.close()
