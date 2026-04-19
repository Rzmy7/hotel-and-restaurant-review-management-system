import React from 'react';
import {
    UserPlus,
    Building2,
    CheckCircle2,
    XCircle,
    CreditCard,
    Bot,
    Clock,
    Activity,
} from 'lucide-react';
import type { RecentActivity as RecentActivityType } from '../types';

interface RecentActivityProps {
    activities: RecentActivityType[];
    onViewAll?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities, onViewAll }) => {
    const getActivityIcon = (type: RecentActivityType['type']) => {
        switch (type) {
            case 'user_joined':
                return <UserPlus size={14} className="text-blue-500" />;
            case 'org_created':
                return <Building2 size={14} className="text-purple-500" />;
            case 'scrape_completed':
                return <CheckCircle2 size={14} className="text-emerald-500" />;
            case 'scrape_failed':
                return <XCircle size={14} className="text-red-500" />;
            case 'subscription_changed':
                return <CreditCard size={14} className="text-amber-500" />;
            case 'ai_job':
                return <Bot size={14} className="text-cyan-500" />;
            default:
                return <Clock size={14} className="text-gray-500" />;
        }
    };

    const getActivityBg = (type: RecentActivityType['type']) => {
        switch (type) {
            case 'user_joined':
                return 'bg-blue-50 ring-1 ring-blue-100';
            case 'org_created':
                return 'bg-purple-50 ring-1 ring-purple-100';
            case 'scrape_completed':
                return 'bg-emerald-50 ring-1 ring-emerald-100';
            case 'scrape_failed':
                return 'bg-red-50 ring-1 ring-red-100';
            case 'subscription_changed':
                return 'bg-amber-50 ring-1 ring-amber-100';
            case 'ai_job':
                return 'bg-cyan-50 ring-1 ring-cyan-100';
            default:
                return 'bg-gray-50 ring-1 ring-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full hover:shadow-md hover:border-gray-200 transition-all duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-blue-50">
                        <Activity size={18} className="text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                </div>
                {onViewAll && (
                    <button
                        onClick={onViewAll}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        View All
                    </button>
                )}
            </div>

            {/* Activity List */}
            <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto flex-1">
                {activities.length === 0 ? (
                    <div className="px-5 py-10 text-center text-gray-400">
                        <Activity size={28} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No recent activity</p>
                        <p className="text-xs text-gray-400 mt-1">Activity will appear here as it happens</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors"
                        >
                            <div
                                className={`flex-shrink-0 p-2 rounded-lg ${getActivityBg(activity.type)}`}
                            >
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                    {activity.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <Clock size={10} className="text-gray-400" />
                                    <span className="text-[11px] text-gray-400">
                                        {activity.timestamp}
                                    </span>
                                    {activity.user && (
                                        <>
                                            <span className="text-gray-300">·</span>
                                            <span className="text-[11px] text-gray-500">
                                                {activity.user}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
