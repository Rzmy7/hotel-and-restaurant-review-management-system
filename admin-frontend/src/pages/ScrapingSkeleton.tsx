import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const MetricCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex flex-col justify-between h-[102px]">
        <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
        </div>
        <div className="space-y-1.5 mt-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-3 w-32 rounded" />
        </div>
    </div>
);

const PlatformConfigSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-6">
        <div className="flex items-start justify-between">
            <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4.5 w-96 rounded max-w-full" />
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
                <Skeleton className="w-32 h-9 rounded-lg" />
                <Skeleton className="w-24 h-9 rounded-lg" />
            </div>
        </div>
        <div className="space-y-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100/50 dark:border-slate-700/50 bg-gray-50/30 dark:bg-slate-900/10">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24 rounded" />
                            <Skeleton className="h-3 w-16 rounded" />
                        </div>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-10 h-6 rounded-full" />
                            <Skeleton className="h-3.5 w-12 rounded" />
                        </div>
                        <Skeleton className="w-28 h-9 rounded-lg" />
                        <Skeleton className="w-20 h-9 rounded-lg" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const JobStatusSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 flex-wrap gap-4">
            <div className="space-y-1.5">
                <Skeleton className="h-5 w-36 rounded" />
                <Skeleton className="h-4 w-72 rounded max-w-full" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="w-24 h-9 rounded-lg" />
                <Skeleton className="w-24 h-9 rounded-lg" />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 w-[20%]"><Skeleton className="h-4 w-20 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[10%]"><Skeleton className="h-4 w-12 rounded" /></th>
                        <th className="px-6 py-4 w-[10%] text-center"><Skeleton className="h-4 w-12 mx-auto rounded" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {[1, 2, 3, 4, 5].map((row) => (
                        <tr key={row}>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-32 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-20 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5.5 w-16 rounded-full" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-24 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-24 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-16 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <div className="flex justify-center items-center gap-2">
                                    <Skeleton className="w-8 h-8 rounded" />
                                    <Skeleton className="w-8 h-8 rounded" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
            </div>
        </div>
    </div>
);

export const ScrapingSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
            </div>

            {/* Platform Configuration Card */}
            <PlatformConfigSkeleton />

            {/* Job Status Table */}
            <JobStatusSkeleton />
        </div>
    );
};

export default ScrapingSkeleton;
