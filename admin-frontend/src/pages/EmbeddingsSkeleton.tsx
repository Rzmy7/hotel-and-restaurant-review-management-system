import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const ServiceControlSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                    <Skeleton className="h-5 w-48 rounded" />
                    <Skeleton className="h-4 w-96 rounded max-w-full" />
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 mr-2">
                    <Skeleton className="w-2.5 h-2.5 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded" />
                </div>
                <Skeleton className="w-32 h-10 rounded-lg" />
            </div>
        </div>
    </div>
);

const VectorDbSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-5 w-32 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 w-16 rounded" />
            </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/50 dark:bg-slate-900/50 rounded-lg">
            <div className="space-y-1.5">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-6 w-24 rounded-md" />
            </div>
        </div>

        {/* Additional Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-lg space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4.5 w-12 rounded" />
            </div>
            <div className="p-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-lg space-y-1.5">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-4.5 w-16 rounded" />
            </div>
            <div className="p-3 bg-gray-50/50 dark:bg-slate-900/50 rounded-lg space-y-1.5">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-4.5 w-12 rounded" />
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Skeleton className="w-24 h-9 rounded-lg" />
            <Skeleton className="w-28 h-9 rounded-lg" />
        </div>
    </div>
);

const ThresholdsSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-4">
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded" />
                <Skeleton className="h-5 w-44 rounded" />
            </div>
            <Skeleton className="w-28 h-4 rounded" />
        </div>

        <div className="space-y-4 pt-1">
            <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-80 rounded" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-72 rounded" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-10 w-full rounded-lg" />
                <Skeleton className="h-3 w-64 rounded" />
            </div>
        </div>
    </div>
);

const JobsTableSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                    <tr className="border-y border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50">
                        <th className="px-6 py-3 w-[20%]"><Skeleton className="h-3.5 w-16 rounded" /></th>
                        <th className="px-6 py-3 w-[15%]"><Skeleton className="h-3.5 w-12 rounded" /></th>
                        <th className="px-6 py-3 w-[15%]"><Skeleton className="h-3.5 w-12 rounded" /></th>
                        <th className="px-6 py-3 w-[20%]"><Skeleton className="h-3.5 w-20 rounded" /></th>
                        <th className="px-6 py-3 w-[15%]"><Skeleton className="h-3.5 w-16 rounded" /></th>
                        <th className="px-6 py-3 w-[15%]"><Skeleton className="h-3.5 w-24 rounded" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {[1, 2, 3, 4].map((row) => (
                        <tr key={row}>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5 w-28 rounded font-mono" />
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5.5 w-16 rounded-full" />
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5.5 w-20 rounded-full" />
                            </td>
                            <td className="px-6 py-4">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-3.5 w-8 rounded" />
                                        <Skeleton className="h-3.5 w-20 rounded" />
                                    </div>
                                    <Skeleton className="h-2 w-full rounded-full" />
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5 w-12 rounded" />
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5 w-32 rounded" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export const EmbeddingsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans animate-shimmer">
            {/* Service Status & Control */}
            <ServiceControlSkeleton />

            {/* Vector Database & Similarity Thresholds Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <VectorDbSkeleton />
                <ThresholdsSkeleton />
            </div>

            {/* Recent Embedding Jobs */}
            <JobsTableSkeleton />
        </div>
    );
};

export default EmbeddingsSkeleton;
