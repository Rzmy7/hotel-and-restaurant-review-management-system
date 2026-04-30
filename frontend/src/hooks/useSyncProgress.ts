import { useState, useEffect, useCallback, useRef } from 'react';

interface SyncProgressData {
    id: string;
    status: string;
    percentage: number;
    progress: string;
    reviews_extracted: number;
    total_reviews: number;
}

import { useQueryClient } from '@tanstack/react-query';
import { getApiBaseUrl } from '../config/api';

export const useSyncProgress = (sourceId: string | number | null, isActive: boolean) => {
    const [progress, setProgress] = useState<SyncProgressData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const queryClient = useQueryClient();

    const connect = useCallback(() => {
        if (!sourceId || !isActive) return;

        // Construct WebSocket URL using the configured API base URL
        const baseUrl = getApiBaseUrl();
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const wsUrl = `${wsBaseUrl}/api/source/${sourceId}/progress`;

        console.log(`Connecting to sync progress: ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Sync progress WebSocket connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                setProgress(data);
                
                // If the sync is complete, invalidate reviews query to refresh UI
                if (data.status === 'completed' || data.status === 'processed') {
                    queryClient.invalidateQueries({ queryKey: ['reviews'] });
                    queryClient.invalidateQueries({ queryKey: ['review-stats'] });
                }
            } catch (err) {
                console.error('Failed to parse sync progress message', err);
            }
        };

        ws.onclose = () => {
            console.log('Sync progress WebSocket disconnected');
            setIsConnected(false);
            wsRef.current = null;
        };

        ws.onerror = (err) => {
            console.error('Sync progress WebSocket error', err);
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
