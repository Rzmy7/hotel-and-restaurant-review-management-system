import asyncio
import logging
import json
import os
import ssl
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
            self.frontend_connections[source_id].discard(websocket)
            if not self.frontend_connections[source_id]:
                del self.frontend_connections[source_id]
                # Cancel relay task if no one is listening
                if source_id in self.relay_tasks:
                    self.relay_tasks[source_id].cancel()
                    del self.relay_tasks[source_id]
        logger.info(f"Frontend client disconnected from sync trace: {source_id}")

    def _build_scraper_ws_url(self) -> str:
        """Build the base WebSocket URL for the scraper engine."""
        scraper_ws_url_base = os.getenv("SCRAPER_WS_URL", "")
        if scraper_ws_url_base:
            return scraper_ws_url_base.rstrip("/")

        from app.core.config import SCRAPER_ENGINE_URL
        # Convert http(s) to ws(s) and append the WS path
        base = SCRAPER_ENGINE_URL.replace("https://", "wss://").replace("http://", "ws://")
        return f"{base}/ws/jobs"

    async def _wait_for_job_id(self, source_id: str, timeout: float = 15.0) -> str:
        """
        Wait for a job_id to be registered for the given source_id.
        
        The frontend may connect to the WebSocket before trigger_sync()
        has finished calling the scraper engine and calling register_job().
        This method polls the mapping, giving the trigger call time to
        complete. Falls back to source_id after the timeout.
        """
        elapsed = 0.0
        poll_interval = 0.5

        while elapsed < timeout:
            job_id = self.source_to_job.get(source_id)
            if job_id:
                logger.info(f"Resolved job_id for source {source_id}: {job_id}")
                return job_id
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval

        logger.warning(
            f"Timed out waiting for job_id mapping for source {source_id} "
            f"after {timeout}s. Falling back to source_id."
        )
        return source_id

    async def _relay_scraper_progress(self, source_id: str):
        """Connects to Scraper Engine and broadcasts updates to all listening frontends."""
        scraper_ws_url_base = self._build_scraper_ws_url()

        # Wait for the job_id to be registered before connecting
        target_id = await self._wait_for_job_id(source_id)
        url = f"{scraper_ws_url_base}/{target_id}"

        # Build SSL context for wss:// connections
        ssl_context: Optional[ssl.SSLContext] = None
        if url.startswith("wss://"):
            ssl_context = ssl.create_default_context()
            # Accept system-trusted certificates (including Let's Encrypt)
            # If connecting to an internal service with a self-signed cert,
            # you can set: ssl_context.check_hostname = False; ssl_context.verify_mode = ssl.CERT_NONE

        retry_count = 0
        max_retries = 5
        
        while retry_count < max_retries:
            try:
                async with websockets.connect(
                    url,
                    ssl=ssl_context,
                    ping_interval=20,   # Send a ping every 20s to keep nginx/proxy from timing out
                    ping_timeout=10,
                    close_timeout=5,
                ) as scraper_ws:
                    logger.info(f"Connected to Scraper Engine WS for source {source_id} at {url}")
                    retry_count = 0  # Reset retries on successful connection
                    
                    last_broadcast_time = 0
                    throttle_interval = 0.5  # 500ms
                    
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
            except websockets.exceptions.InvalidStatusCode as e:
                logger.error(f"Scraper WS rejected connection for {source_id} (HTTP {e.status_code}): {e}")
                retry_count += 1
            except websockets.exceptions.ConnectionClosedError as e:
                logger.warning(f"Scraper WS connection closed for {source_id}: {e}")
                retry_count += 1
            except ConnectionRefusedError:
                logger.error(f"Scraper WS connection refused for {source_id} at {url}")
                retry_count += 1
            except Exception as e:
                logger.error(f"Error in scraper relay for {source_id} (target {target_id}): {type(e).__name__}: {e}")
                retry_count += 1

            if retry_count < max_retries:
                wait_time = min(2 ** retry_count, 10)  # Exponential backoff, capped at 10s
                logger.info(f"Retrying relay for {source_id} in {wait_time}s (attempt {retry_count}/{max_retries})")
                await asyncio.sleep(wait_time)

                # Re-check if a job_id appeared since the first attempt
                new_target = self.source_to_job.get(source_id, target_id)
                if new_target != target_id:
                    target_id = new_target
                    url = f"{scraper_ws_url_base}/{target_id}"
                    logger.info(f"Updated target for {source_id} to {target_id}")

        logger.warning(f"Exiting relay for {source_id} after {retry_count} failures.")

        # Clean up relay state so a future frontend connection can start fresh
        self.relay_tasks.pop(source_id, None)
        self.source_to_job.pop(source_id, None)

# Global singleton
sync_socket_manager = SyncConnectionManager()
