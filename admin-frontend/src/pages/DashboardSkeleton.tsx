import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between h-[102px]">
        <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl" />
    </div>
);

const SystemHealthBarSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                </div>
            </div>
            <Skeleton className="w-20 h-5 rounded" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50/50 dark:bg-slate-700/30 border border-gray-100/50 dark:border-slate-700">
                    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5 min-w-0">
                        <Skeleton className="h-3.5 w-16 rounded" />
                        <Skeleton className="h-3 w-12 rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const ChartSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-4 h-[350px] flex flex-col justify-between">
        <div className="flex items-center justify-between">
            <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-3.5 w-48 rounded" />
            </div>
            <Skeleton className="w-24 h-8 rounded-lg" />
        </div>
        <div className="flex-1 flex items-end gap-4 px-2 pt-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <Skeleton 
                        className="w-full rounded-t-sm" 
                        style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }} 
                    />
                    <Skeleton className="h-2.5 w-6 rounded" />
                </div>
            ))}
        </div>
    </div>
);

const BottomPanelSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 space-y-4 h-[380px] flex flex-col justify-between">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-700">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="w-16 h-5 rounded" />
        </div>
        <div className="flex-1 space-y-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3.5 w-24 rounded" />
                            <Skeleton className="h-3 w-12 rounded" />
                        </div>
                        <Skeleton className="h-3 w-full rounded" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const DashboardSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* System Health Overview */}
            <SystemHealthBarSkeleton />

            {/* Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartSkeleton />
                <ChartSkeleton />
            </div>

            {/* Activity + Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BottomPanelSkeleton />
                <BottomPanelSkeleton />
            </div>
        </div>
    );
};

export default DashboardSkeleton;
