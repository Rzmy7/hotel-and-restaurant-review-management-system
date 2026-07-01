import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Server, Search, Database, Globe, ChevronRight } from 'lucide-react';
import type { ServerStatus } from '../types';
import { Skeleton } from './shared/Skeleton';

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
                text: 'text-emerald-700 dark:text-emerald-400',
                label: 'Online',
            };
        case 'Warning':
            return {
                dot: 'bg-amber-500',
                ring: 'ring-amber-500/20',
                bg: 'bg-amber-50',
                text: 'text-amber-700 dark:text-amber-400',
                label: 'Warning',
            };
        default:
            return {
                dot: 'bg-red-500',
                ring: 'ring-red-500/20',
                bg: 'bg-red-50',
                text: 'text-red-700 dark:text-red-400',
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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 transition-colors duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg ${allHealthy ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                        <Activity
                            size={18}
                            className={allHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
                        />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">System Health</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                            {loading
                                ? 'Checking services...'
                                : `${onlineCount}/${totalCount} services operational`}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/monitoring')}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
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
                            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50/50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700"
                        >
                            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-3 w-20 rounded" />
                                <Skeleton className="h-2.5 w-12 rounded" />
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
                                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50/70 dark:bg-slate-700/40 border border-gray-100 dark:border-slate-600 hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-500 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                    <Icon size={16} className="text-blue-500 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">
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
