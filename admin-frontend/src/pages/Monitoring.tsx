import React, { useEffect, useState } from 'react';
import { ServerStatsGrid } from '../components/ServerStatsGrid';
import { Alert } from '../components/Alert';
import { fetchServerStatuses } from '../services/monitoringService';
import type { ServerStatus } from '../types';

export const Monitoring: React.FC = () => {
    const [servers, setServers] = useState<ServerStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setError(null);
                const serverData = await fetchServerStatuses();
                setServers(serverData);
            } catch (err) {
                console.error('Failed to load server statuses:', err);
                setError('Failed to load server statuses. Please check your network connection.');
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Auto-refresh every 10 seconds
        const interval = setInterval(async () => {
            try {
                const serverData = await fetchServerStatuses();
                setServers(serverData);
                setError(null);
            } catch (err) {
                console.error('Failed to refresh server statuses:', err);
                // Don't set error on refresh failures to avoid flickering
            }
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6 pt-4">
            {/* Error Alert */}
            {error && (
                <Alert 
                    type="error" 
                    message={error}
                    onClose={() => setError(null)}
                />
            )}

            {/* Server Cards */}
            <div>
                <p className="text-gray-500 mb-4 pt-2">Server status and performance metrics</p>
                <ServerStatsGrid servers={servers} loading={loading} />
            </div>
        </div>
    );
};
