import asyncio
import logging
import json
import os
import uuid
from typing import Dict, Set, Optional
from fastapi import WebSocket
import httpx
import websockets

logger = logging.getLogger(__name__)

class SyncConnectionManager:
    def __init__(self):
        # Maps source_id to a set of connected frontend WebSockets
        self.frontend_connections: Dict[str, Set[WebSocket]] = {}
        # Maps source_id to the active task responsible for relaying from Scraper Engine
        self.relay_tasks: Dict[str, asyncio.Task] = {}
        # Maps source_id to the actual scraper job_id
        self.source_to_job: Dict[str, str] = {}

    def register_job(self, source_id: str, job_id: str):
        """Called by source_service when a sync is triggered to link source to job."""
        self.source_to_job[source_id] = job_id
        logger.info(f"Registered job mapping: source {source_id} -> job {job_id}")

    async def connect_frontend(self, websocket: WebSocket, source_id: str):
        await websocket.accept()
        if source_id not in self.frontend_connections:
            self.frontend_connections[source_id] = set()
        self.frontend_connections[source_id].add(websocket)
        
        # If we don't have a relay task for this source yet, start one
        if source_id not in self.relay_tasks or self.relay_tasks[source_id].done():
            self.relay_tasks[source_id] = asyncio.create_task(self._relay_scraper_progress(source_id))
        
        logger.info(f"Frontend client connected to sync trace: {source_id}")

    async def disconnect_frontend(self, websocket: WebSocket, source_id: str):
        if source_id in self.frontend_connections:
            self.frontend_connections[source_id].remove(websocket)
            if not self.frontend_connections[source_id]:
                del self.frontend_connections[source_id]
                # Optional: Cancel relay task if no one is listening
                # However, we might want to keep it running for a bit
                if source_id in self.relay_tasks:
                    self.relay_tasks[source_id].cancel()
                    del self.relay_tasks[source_id]
        logger.info(f"Frontend client disconnected from sync trace: {source_id}")

    async def _relay_scraper_progress(self, source_id: str):
        """Connects to Scraper Engine and broadcasts updates to all listening frontends."""
        scraper_ws_url_base = os.getenv("SCRAPER_WS_URL", "")
        if not scraper_ws_url_base:
            from app.core.config import SCRAPER_ENGINE_URL
            scraper_ws_url_base = SCRAPER_ENGINE_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/jobs"
        
        retry_count = 0
        max_retries = 5
        
        while retry_count < max_retries:
            # Re-calculate target_id and url on every retry to pick up newly registered job_ids
            target_id = self.source_to_job.get(source_id, source_id)
            url = f"{scraper_ws_url_base}/{target_id}"
            
            try:
                async with websockets.connect(url) as scraper_ws:
                    logger.info(f"Connected to Scraper Engine WS for source {source_id} using target {target_id}")
                    retry_count = 0 # Reset retries on successful connection
                    
                    last_broadcast_time = 0
                    throttle_interval = 0.5 # 500ms
                    
                    async for message in scraper_ws:
                        try:
                            data = json.loads(message)
                        except json.JSONDecodeError:
                            logger.error(f"Failed to parse message from scraper: {message[:100]}")
                            continue

                        # Inject source_id so frontend always knows which source this belongs to
                        data["source_id"] = source_id
                        
                        current_time = asyncio.get_event_loop().time()
                        
                        # Throttling percentage updates, but always send completed/failed status
                        status = data.get("status", "").lower()
                        is_terminal = status in ["completed", "failed", "processed", "error"]
                        
                        if is_terminal or (current_time - last_broadcast_time >= throttle_interval):
                            # Broadcast to all connected frontends
                            if source_id in self.frontend_connections:
                                clients = list(self.frontend_connections[source_id])
                                for client in clients:
                                    try:
                                        await client.send_json(data)
                                    except Exception as e:
                                        logger.error(f"Failed to relay message to frontend: {e}")
                            
                            last_broadcast_time = current_time
                        
                        # Stop relaying if job is finished
                        if is_terminal:
                            logger.info(f"Job for source {source_id} finished with status: {status}. Closing relay.")
                            return

            except asyncio.CancelledError:
                logger.info(f"Relay task for {source_id} cancelled.")
                break
            except Exception as e:
                logger.error(f"Error in scraper relay for {source_id} (target {target_id}): {e}")
                retry_count += 1
                if retry_count < max_retries:
                    await asyncio.sleep(2) # Wait before retry

        logger.warning(f"Exiting relay for {source_id} after {retry_count} failures.")

# Global singleton
sync_socket_manager = SyncConnectionManager()
