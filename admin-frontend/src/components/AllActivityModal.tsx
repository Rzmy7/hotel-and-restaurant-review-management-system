import React, { useEffect, useState } from 'react';
import {
    X,
    UserPlus,
    UserMinus,
    Building2,
    CheckCircle2,
    XCircle,
    CreditCard,
    Bot,
    Clock,
    Activity,
    Settings,
    Megaphone,
    Wrench,
    Trash2,
    Database,
} from 'lucide-react';
import type { RecentActivity as RecentActivityType } from '../types';
import { fetchPaginatedActivity } from '../services/dashboardService';
import { Pagination } from './Pagination';
import Skeleton from './shared/Skeleton';
import { formatDateTime } from '../utils/dateTime';

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
        case 'settings_updated':
            return <Settings size={14} className="text-indigo-500" />;
        case 'broadcast_sent':
            return <Megaphone size={14} className="text-pink-500" />;
        case 'maintenance_toggled':
            return <Wrench size={14} className="text-orange-500" />;
        case 'user_deleted':
            return <UserMinus size={14} className="text-red-500" />;
        case 'org_deleted':
            return <Trash2 size={14} className="text-red-500" />;
        case 'embeddings_triggered':
            return <Database size={14} className="text-teal-500" />;
        default:
            return <Clock size={14} className="text-gray-500 dark:text-slate-400" />;
    }
};

const getActivityBg = (type: RecentActivityType['type']) => {
    switch (type) {
        case 'user_joined':
            return 'bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:ring-blue-800/50';
        case 'org_created':
            return 'bg-purple-50 ring-1 ring-purple-100 dark:bg-purple-900/30 dark:ring-purple-800/50';
        case 'scrape_completed':
            return 'bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:ring-emerald-800/50';
        case 'scrape_failed':
            return 'bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50';
        case 'subscription_changed':
            return 'bg-amber-50 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:ring-amber-800/50';
        case 'ai_job':
            return 'bg-cyan-50 ring-1 ring-cyan-100 dark:bg-cyan-900/30 dark:ring-cyan-800/50';
        case 'settings_updated':
            return 'bg-indigo-50 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:ring-indigo-800/50';
        case 'broadcast_sent':
            return 'bg-pink-50 ring-1 ring-pink-100 dark:bg-pink-900/30 dark:ring-pink-800/50';
        case 'maintenance_toggled':
            return 'bg-orange-50 ring-1 ring-orange-100 dark:bg-orange-900/30 dark:ring-orange-800/50';
        case 'user_deleted':
            return 'bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50';
        case 'org_deleted':
            return 'bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50';
        case 'embeddings_triggered':
            return 'bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:ring-teal-800/50';
        default:
            return 'bg-gray-50 ring-1 ring-gray-100 dark:bg-slate-700 dark:ring-slate-600';
    }
};

interface AllActivityModalProps {
    isOpen: boolean;
    onClose: () => void;
    timezone: string;
}

export const AllActivityModal: React.FC<AllActivityModalProps> = ({ isOpen, onClose, timezone }) => {
    const [activities, setActivities] = useState<RecentActivityType[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const limit = 10;

    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        const loadActivities = async () => {
            setLoading(true);
            try {
                const response = await fetchPaginatedActivity(page, limit);
                if (isMounted) {
                    setActivities(response.data);
                    setTotal(response.total);
                }
            } catch (error) {
                console.error('Failed to load paginated activities:', error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadActivities();

        return () => {
            isMounted = false;
        };
    }, [isOpen, page]);

    if (!isOpen) return null;

    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100 dark:border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                            <Activity size={20} className="text-blue-500 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Activity</h2>
                            <p className="text-sm text-gray-500 dark:text-slate-400">System-wide activity log</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50 animate-shimmer">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="p-4 flex items-start gap-4 mx-2 my-1">
                                    <Skeleton className="w-11 h-11 rounded-xl flex-shrink-0" />
                                    <div className="flex-1 space-y-2 pt-0.5">
                                        <Skeleton className="h-4 w-48 rounded" />
                                        <Skeleton className="h-3.5 w-3/4 rounded" />
                                        <Skeleton className="h-3 w-24 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="py-20 text-center text-gray-400 dark:text-slate-500">
                            <Activity size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                            <p className="text-sm">No activity found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {activities.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="p-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors rounded-lg mx-2 my-1"
                                >
                                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${getActivityBg(activity.type)}`}>
                                        {getActivityIcon(activity.type)}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                                            {activity.description}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock size={12} className="text-gray-400 dark:text-slate-500" />
                                            <span className="text-xs text-gray-400 dark:text-slate-500">
                                                {formatDateTime(activity.timestamp, timezone)}
                                            </span>
                                            {activity.user && (
                                                <>
                                                    <span className="text-gray-300 dark:text-slate-600">·</span>
                                                    <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                                                        {activity.user}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                <div className="mt-auto">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        startIndex={startIndex}
                        onPageChange={setPage}
                        itemLabel="activities"
                    />
                </div>
            </div>
        </div>
    );
};
