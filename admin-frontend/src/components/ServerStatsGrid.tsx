import React from 'react';
import { ServerCard } from './ServerCard';
import type { ServerStatus } from '../types';

interface ServerStatsGridProps {
    servers: ServerStatus[];
}

export const ServerStatsGrid: React.FC<ServerStatsGridProps> = ({ servers }) => {
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
