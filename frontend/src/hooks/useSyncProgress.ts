import { useState, useEffect, useCallback, useRef } from "react";

interface SyncProgressData {
  id: string;
  status: string;
  percentage: number;
  progress: string;
  reviews_extracted: number;
  total_reviews: number;
}

import { useQueryClient } from "@tanstack/react-query";
import { logger } from "../utils/logger";

export const useSyncProgress = (
  sourceId: string | number | null,
  isActive: boolean,
) => {
  const [progress, setProgress] = useState<SyncProgressData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (!sourceId || !isActive) return;

    // Construct WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    // Backend runs on 8000, but if we are on a different port (e.g. production)
    // we might need to handle it. For dev, 8000 is standard.
    const port =
      window.location.port === "5173" || window.location.port === "5174"
        ? "8000"
        : window.location.port;
    const wsUrl = `${protocol}//${host}${port ? `:${port}` : ""}/api/source/${sourceId}/progress`;
 
    logger.debug(`Connecting to sync progress: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      logger.info("Sync progress WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);

        // If the sync is complete, invalidate reviews query to refresh UI
        if (data.status === "completed" || data.status === "processed") {
          queryClient.invalidateQueries({ queryKey: ["reviews"] });
          queryClient.invalidateQueries({ queryKey: ["review-stats"] });
        }
      } catch (err) {
        logger.error("Failed to parse sync progress message", err);
      }
    };

    ws.onclose = () => {
      logger.info("Sync progress WebSocket disconnected");
      setIsConnected(false);
      wsRef.current = null;
    };
 
    ws.onerror = (err) => {
      logger.error("Sync progress WebSocket error", err);
    };
  }, [sourceId, isActive]);

  useEffect(() => {
    if (isActive && sourceId) {
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setProgress(null);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [sourceId, isActive, connect]);

  return { progress, isConnected };
};
