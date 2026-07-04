import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const MetricCardSkeleton: React.FC = () => (
    <div className="p-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl relative overflow-hidden flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-8 w-1/3 rounded-lg" />
        </div>
    </div>
);

const ChartSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-[380px] flex flex-col gap-4">
        <div className="flex justify-between items-center">
            <Skeleton className="w-1/3 h-6 rounded" />
            <Skeleton className="w-24 h-6 rounded" />
        </div>
        <Skeleton className="flex-1 w-full rounded-xl" />
        <div className="flex justify-between gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 flex-1 rounded" />
            ))}
        </div>
    </div>
);

const ListSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm space-y-4">
        <Skeleton className="w-1/4 h-6 mb-6 rounded" />
        {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 items-center py-3 border-b border-gray-50 dark:border-slate-700/40 last:border-0">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-1/3 h-4 rounded" />
                    <Skeleton className="w-2/3 h-3 rounded" />
                </div>
            </div>
        ))}
    </div>
);

const DashboardSkeleton: React.FC = () => {
    return (
        <>
            {/* Header Skeleton */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="w-48 h-6 rounded" />
                        <Skeleton className="w-32 h-4 rounded" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <Skeleton className="w-32 h-10 rounded-xl" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="w-10 h-10 rounded-xl" />
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50 dark:bg-transparent">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ChartSkeleton />
                    <ChartSkeleton />
                </div>

                {/* Reviews and Category Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ListSkeleton />
                    <ListSkeleton />
                </div>

                {/* AI Insights and Alerts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <ListSkeleton />
                    <ListSkeleton />
                </div>

                {/* Source Comparison */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-64">
                    <Skeleton className="w-1/6 h-6 mb-6 rounded" />
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="w-24 h-4 rounded" />
                                    <Skeleton className="w-12 h-4 rounded" />
                                </div>
                                <Skeleton className="w-full h-3 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardSkeleton;
