import React, { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { ServerStatsGrid } from '../components/ServerStatsGrid';
import { fetchServerStatuses } from '../services/mockService';
import type { ServerStatus } from '../types';

export const Monitoring: React.FC = () => {
    const [servers, setServers] = useState<ServerStatus[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            const serverData = await fetchServerStatuses();
            setServers(serverData);
            setLoading(false);
        };

        loadData();

        // Auto-refresh every 10 seconds
        const interval = setInterval(() => {
            fetchServerStatuses().then(setServers);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Server Cards */}
            <div>
                <p className="text-gray-500 mb-4 pt-2">Server status and performance metrics</p>
                <ServerStatsGrid servers={servers} />
            </div>
        </div>
    );
};
