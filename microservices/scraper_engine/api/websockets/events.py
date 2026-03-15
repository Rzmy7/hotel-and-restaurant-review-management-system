from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging
import asyncio
from core.job_manager import job_manager

logger = logging.getLogger("websocket_events")
router = APIRouter(prefix="/ws", tags=["Real-time Streaming"])

class ConnectionManager:
    def __init__(self):
        # Maps job_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, job_id: str):
        await websocket.accept()
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        self.active_connections[job_id].append(websocket)
        logger.info(f"Client connected to active job hook: {job_id}")

    def disconnect(self, websocket: WebSocket, job_id: str):
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
        logger.info(f"Client disconnected from active job hook: {job_id}")

    async def broadcast(self, job_id: str, message: dict):
        if job_id in self.active_connections:
            for connection in self.active_connections[job_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Failed to push message payload to websocket client: {e}")

# Global connection state manager
manager = ConnectionManager()

@router.websocket("/jobs/{job_id}")
async def websocket_job_endpoint(websocket: WebSocket, job_id: str):
    """
    WebSocket endpoint for web-frontends to attach to an actively running background scrape hook 
    and instantly stream execution traces instead of constantly HTTP-polling for process status.
    """
    await manager.connect(websocket, job_id)
    try:
        while True:
            job_data = job_manager.get_job(job_id)
            if job_data:
                await websocket.send_json(job_data)
                if job_data["status"] in ["completed", "failed"]:
                    break
            else:
                await websocket.send_json({"error": "Job not found"})
                break
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket, job_id)
