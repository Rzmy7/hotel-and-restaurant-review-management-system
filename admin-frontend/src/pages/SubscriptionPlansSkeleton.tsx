import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-5 py-4 h-[94px] space-y-2">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-7 w-12 rounded-md" />
        <Skeleton className="h-3.5 w-32 rounded" />
    </div>
);

const PlanCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 space-y-5">
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28 rounded-md" />
                <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-44 rounded" />
        </div>
        
        <div className="py-2">
            <Skeleton className="h-9 w-24 rounded-md" />
        </div>

        <div className="border-t border-gray-100 dark:border-slate-700/50 pt-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded-full" />
                    <Skeleton className="h-3.5 flex-1 rounded" />
                </div>
            ))}
        </div>

        <div className="flex gap-2 pt-2">
            <Skeleton className="flex-1 h-9 rounded-lg" />
            <Skeleton className="flex-1 h-9 rounded-lg" />
        </div>
    </div>
);

export const SubscriptionPlansSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Filter / Actions row */}
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-44 rounded-xl" />
                <Skeleton className="h-10 w-28 rounded-xl" />
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map((i) => (
                    <PlanCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

export default SubscriptionPlansSkeleton;
