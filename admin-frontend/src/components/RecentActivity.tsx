import React from 'react';
import { 
    UserPlus, 
    Building2, 
    CheckCircle2, 
    XCircle, 
    CreditCard, 
    Bot,
    Clock,
    Activity
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
                return <UserPlus size={16} className="text-blue-500" />;
            case 'org_created':
                return <Building2 size={16} className="text-purple-500" />;
            case 'scrape_completed':
                return <CheckCircle2 size={16} className="text-green-500" />;
            case 'scrape_failed':
                return <XCircle size={16} className="text-red-500" />;
            case 'subscription_changed':
                return <CreditCard size={16} className="text-amber-500" />;
            case 'ai_job':
                return <Bot size={16} className="text-cyan-500" />;
            default:
                return <Clock size={16} className="text-gray-500" />;
        }
    };

    const getActivityBg = (type: RecentActivityType['type']) => {
        switch (type) {
            case 'user_joined':
                return 'bg-blue-100';
            case 'org_created':
                return 'bg-purple-100';
            case 'scrape_completed':
                return 'bg-green-100';
            case 'scrape_failed':
                return 'bg-red-100';
            case 'subscription_changed':
                return 'bg-amber-100';
            case 'ai_job':
                return 'bg-cyan-100';
            default:
                return 'bg-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Activity size={20} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                </div>
                {onViewAll && (
                    <button 
                        onClick={onViewAll}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                        View All
                    </button>
                )}
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="px-5 py-8 text-center text-gray-500">
                        <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                        <p>No recent activity</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div 
                            key={activity.id} 
                            className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
                        >
                            <div className={`flex-shrink-0 p-2 rounded-full ${getActivityBg(activity.type)}`}>
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                    {activity.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-0.5">
                                    {activity.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">
                                        {activity.timestamp}
                                    </span>
                                    {activity.user && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <span className="text-xs text-gray-500">
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
