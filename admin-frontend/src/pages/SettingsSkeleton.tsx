import React from 'react';
import Skeleton from '../components/shared/Skeleton';

export const SettingsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans animate-shimmer">
            {/* Tabs Skeleton */}
            <div className="flex border-b border-gray-200 dark:border-slate-700 pb-px gap-2">
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
            </div>

            <div className="space-y-4">
                {/* General Settings Card */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 space-y-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40 rounded" />
                        <Skeleton className="h-4 w-72 rounded" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20 rounded" />
                            <Skeleton className="h-10 w-full rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* Appearance + Maintenance Mode - side by side */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Theme / Dark Mode Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 rounded" />
                            <Skeleton className="h-3.5 w-[85%] rounded" />
                        </div>
                        <div className="flex gap-3">
                            <Skeleton className="flex-1 h-16 rounded-xl" />
                            <Skeleton className="flex-1 h-16 rounded-xl" />
                            <Skeleton className="flex-1 h-16 rounded-xl" />
                        </div>
                    </div>

                    {/* Maintenance Mode Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 flex flex-col justify-between h-[132px]">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-36 rounded" />
                            <Skeleton className="h-3.5 w-[90%] rounded" />
                        </div>
                        <div className="flex justify-end">
                            <Skeleton className="w-11 h-6 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* Save Button Row */}
                <div className="flex justify-end">
                    <Skeleton className="w-32 h-10 rounded-lg" />
                </div>
            </div>
        </div>
    );
};

export default SettingsSkeleton;
