import React from 'react';
import { ServerCard } from './ServerCard';
import type { ServerStatus } from '../types';
import { Skeleton } from './shared/Skeleton';

interface ServerStatsGridProps {
    servers: ServerStatus[];
    loading?: boolean;
}

const SkeletonCard: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div>
                    <Skeleton className="h-4 w-28 rounded mb-1.5" />
                    <Skeleton className="h-3 w-16 rounded" />
                </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
            <div>
                <Skeleton className="h-3 w-20 rounded mb-1" />
                <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div>
                <Skeleton className="h-3 w-20 rounded mb-1" />
                <Skeleton className="h-2 w-full rounded-full" />
            </div>
        </div>
    </div>
);

export const ServerStatsGrid: React.FC<ServerStatsGridProps> = ({ servers, loading }) => {
    if (loading && servers.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {servers.map((server) => (
                <ServerCard
                    key={server.id}
                    name={server.name}
                    status={server.status}
                    cpuUsage={server.cpuUsage}
                    ramUsage={server.ramUsage}
                    icon={server.icon}
                    uptime={server.uptime}
                />
            ))}
        </div>
    );
};
