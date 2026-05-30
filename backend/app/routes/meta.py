"""Meta routes: service banner, health, ping, and the ping WebSocket."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..controllers import meta as meta_ctrl
from ..core.responses import SuccessEnvelope
from ..schemas.meta import HealthData, PingData, RootData

router = APIRouter()

router.add_api_route(
    "/", meta_ctrl.root_controller, methods=["GET"], tags=["meta"],
    response_model=SuccessEnvelope[RootData],
)
router.add_api_route(
    "/health", meta_ctrl.health_controller, methods=["GET"], tags=["meta"],
    response_model=SuccessEnvelope[HealthData],
)
router.add_api_route(
    "/ping", meta_ctrl.ping_controller, methods=["GET"], tags=["ping"],
    response_model=SuccessEnvelope[PingData],
)


@router.websocket("/ws/ping")
async def ws_ping(websocket: WebSocket) -> None:
    """WebSocket channel: every ``ping`` frame is answered with ``pong``."""
    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            await websocket.send_text("pong" if text.strip().lower() == "ping" else f"echo:{text}")
    except WebSocketDisconnect:
        return
