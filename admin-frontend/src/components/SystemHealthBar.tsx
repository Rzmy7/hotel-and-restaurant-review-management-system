import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Server, Search, Database, Globe, ChevronRight } from 'lucide-react';
import type { ServerStatus } from '../types';

interface SystemHealthBarProps {
    servers: ServerStatus[];
    loading?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
    'Main Backend': Server,
    'Scraping Service': Search,
    'Embedding Service': Database,
    'Frontend Server': Globe,
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Online':
            return {
                dot: 'bg-emerald-500',
                ring: 'ring-emerald-500/20',
                bg: 'bg-emerald-50',
                text: 'text-emerald-700',
                label: 'Online',
            };
        case 'Warning':
            return {
                dot: 'bg-amber-500',
                ring: 'ring-amber-500/20',
                bg: 'bg-amber-50',
                text: 'text-amber-700',
                label: 'Warning',
            };
        default:
            return {
                dot: 'bg-red-500',
                ring: 'ring-red-500/20',
                bg: 'bg-red-50',
                text: 'text-red-700',
                label: 'Offline',
            };
    }
};

export const SystemHealthBar: React.FC<SystemHealthBarProps> = ({ servers, loading }) => {
    const navigate = useNavigate();

    const onlineCount = servers.filter((s) => s.status === 'Online').length;
    const totalCount = servers.length;
    const allHealthy = onlineCount === totalCount && totalCount > 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${allHealthy ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                        <Activity
                            size={18}
                            className={allHealthy ? 'text-emerald-600' : 'text-amber-600'}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900">System Health</h3>
                        <p className="text-xs text-gray-500">
                            {loading
                                ? 'Checking services...'
                                : `${onlineCount}/${totalCount} services operational`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/monitoring')}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                    View Details
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Server Status Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100 animate-pulse"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-200" />
                            <div className="flex-1">
                                <div className="h-3 w-20 bg-gray-200 rounded mb-1.5" />
                                <div className="h-2.5 w-12 bg-gray-200 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {servers.map((server) => {
                        const status = getStatusColor(server.status);
                        const Icon = iconMap[server.name] || Server;
                        return (
                            <div
                                key={server.id}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50/70 border border-gray-100 hover:border-gray-200 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Icon size={16} className="text-blue-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-800 truncate">
                                        {server.name}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${status.dot} ring-2 ${status.ring}`}
                                        />
                                        <span className={`text-[11px] font-medium ${status.text}`}>
                                            {status.label}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
