import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Cpu, HardDrive } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface ServerCardProps {
    name: string;
    status: 'Online' | 'Offline' | 'Warning';
    cpuUsage: number;
    ramUsage: number;
    icon: LucideIcon;
    uptime?: string;
}

export const ServerCard: React.FC<ServerCardProps> = ({ 
    name, 
    status, 
    cpuUsage, 
    ramUsage, 
    icon: Icon, 
    uptime 
}) => {
    const getCpuColor = (usage: number) => {
        if (usage >= 80) return 'text-red-600 bg-red-50';
        if (usage >= 60) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    const getRamColor = (usage: number) => {
        if (usage >= 80) return 'text-red-600 bg-red-50';
        if (usage >= 60) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    const getProgressColor = (usage: number) => {
        if (usage >= 80) return 'bg-red-500';
        if (usage >= 60) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{name}</h3>
                        {uptime && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">Uptime: {uptime}</p>
                        )}
                    </div>
                </div>
                <StatusBadge status={status} showDot={true} />
            </div>

            {/* CPU Usage */}
            <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Cpu size={16} className="text-gray-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">CPU Usage</span>
                    </div>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${getCpuColor(cpuUsage)}`}>
                        {cpuUsage}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(cpuUsage)}`}
                        style={{ width: `${cpuUsage}%` }}
                    ></div>
                </div>
            </div>

            {/* RAM Usage */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <HardDrive size={16} className="text-gray-400 dark:text-slate-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">RAM Usage</span>
                    </div>
                    <span className={`text-sm font-bold px-2 py-1 rounded ${getRamColor(ramUsage)}`}>
                        {ramUsage}%
                    </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(ramUsage)}`}
                        style={{ width: `${ramUsage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};
