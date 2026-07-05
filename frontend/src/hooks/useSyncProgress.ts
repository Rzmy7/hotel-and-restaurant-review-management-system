import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sourcesService } from '../services/sourcesService';

interface SyncProgressData {
    id: string;
    status: string;
    percentage: number;
    progress: string;
    reviews_extracted: number;
    total_reviews: number;
}

export const useSyncProgress = (sourceId: string | number | null, isActive: boolean) => {
    const [progress, setProgress] = useState<SyncProgressData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const queryClient = useQueryClient();
    const intervalRef = useRef<any>(null);

    const poll = useCallback(async () => {
        if (!sourceId) return;

        try {
            const source = await sourcesService.getSource(sourceId);
            const status = source.status; // 'In Queue' | 'Syncing' | 'Active' | 'Paused' | 'Error'

            let percentage = 0;
            let progressDesc = 'Processing...';

            if (status === 'In Queue') {
                percentage = 15;
                progressDesc = 'Waiting in RabbitMQ job queue...';
                setIsConnected(true);
            } else if (status === 'Syncing') {
                percentage = 55;
                progressDesc = 'Playwright worker actively scraping...';
                setIsConnected(true);
            } else {
                // Completed or failed
                percentage = 100;
                progressDesc = status === 'Error' ? 'Sync Failed' : 'Sync Completed';
                setIsConnected(false);
            }

            setProgress({
                id: String(sourceId),
                status: status.toLowerCase(),
                percentage,
                progress: progressDesc,
                reviews_extracted: 0,
                total_reviews: 0
            });

            // If we transitioned to a final state, invalidate queries to update other parts of the application
            if (status !== 'In Queue' && status !== 'Syncing') {
                console.log(`Sync status finished with [${status}], invalidating queries...`);
                queryClient.invalidateQueries({ queryKey: ['reviews'] });
                queryClient.invalidateQueries({ queryKey: ['review-stats'] });
                queryClient.invalidateQueries({ queryKey: ['sources'] });
                
                // Clear polling interval
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        } catch (err) {
            console.error('Failed to poll sync progress:', err);
        }
    }, [sourceId, queryClient]);

    useEffect(() => {
        if (isActive && sourceId) {
            setIsConnected(true);
            // Poll once immediately
            poll();

            // Setup polling interval every 5 seconds
            intervalRef.current = setInterval(poll, 5000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsConnected(false);
            setProgress(null);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [sourceId, isActive, poll]);

    return { progress, isConnected };
};
