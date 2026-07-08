import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const ApiCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-44 rounded" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-3.5 w-[85%] rounded" />
        </div>
    </div>
);

export const APIManageSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            <div className="space-y-6">
                <ApiCardSkeleton />
                <ApiCardSkeleton />
                <ApiCardSkeleton />

                {/* Save Button Row */}
                <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-4 w-64 rounded" />
                    <Skeleton className="w-36 h-11 rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default APIManageSkeleton;
