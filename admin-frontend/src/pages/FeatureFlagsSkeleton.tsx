import React from 'react';
import Skeleton from '../components/shared/Skeleton';

export const FeatureFlagsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans animate-shimmer">
            {/* Search Bar Skeleton */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>

            {/* List Skeletons */}
            <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                    <div 
                        key={i} 
                        className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between"
                    >
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48 rounded" />
                            <Skeleton className="h-4 w-96 rounded max-w-full" />
                        </div>
                        <div className="flex items-center gap-3 ml-4 shrink-0">
                            <Skeleton className="w-10 h-6 rounded-full" />
                            <Skeleton className="h-4 w-12 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FeatureFlagsSkeleton;
