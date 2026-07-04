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

const BatchConfigSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-start justify-between">
            <div className="space-y-1.5">
                <Skeleton className="h-5 w-48 rounded" />
                <Skeleton className="h-4 w-96 rounded max-w-full" />
            </div>
            <Skeleton className="w-24 h-6 rounded-full shrink-0" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end gap-5 pt-1">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-52 rounded" />
                <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="w-20 h-9 rounded-lg" />
                    <Skeleton className="w-9 h-9 rounded-lg" />
                    <Skeleton className="flex-1 h-5 rounded" />
                </div>
                <div className="flex justify-between pt-0.5">
                    <Skeleton className="h-3 w-36 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                </div>
            </div>
            <Skeleton className="w-24 h-[42px] rounded-lg" />
        </div>
    </div>
);

const DuplicationSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <div className="space-y-1.5 mb-5">
            <Skeleton className="h-5 w-52 rounded" />
            <Skeleton className="h-4 w-96 rounded max-w-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="lg:col-span-2">
                <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 space-y-2">
                        <Skeleton className="h-3 w-36 rounded" />
                        <div className="flex items-baseline gap-2">
                            <Skeleton className="h-6 w-12 rounded" />
                            <Skeleton className="h-3.5 w-24 rounded" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600 space-y-2">
                        <Skeleton className="h-3 w-36 rounded" />
                        <div className="flex items-baseline gap-2">
                            <Skeleton className="h-6 w-12 rounded" />
                            <Skeleton className="h-3.5 w-24 rounded" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                <Skeleton className="h-10 flex-1 rounded-lg" />
                <Skeleton className="h-10 flex-1 rounded-lg" />
            </div>
        </div>
    </div>
);

const JobStatusTableSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-1.5">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-4 w-80 rounded max-w-full" />
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <Skeleton className="w-52 h-9 rounded-lg" />
                <Skeleton className="w-20 h-9 rounded-lg" />
                <Skeleton className="w-24 h-9 rounded-lg" />
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50">
                        <th className="px-4 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-4 py-4 w-[15%]"><Skeleton className="h-4 w-20 rounded" /></th>
                        <th className="px-4 py-4 w-[20%]"><Skeleton className="h-4 w-24 rounded" /></th>
                        <th className="px-4 py-4 w-[15%]"><Skeleton className="h-4 w-12 rounded" /></th>
                        <th className="px-4 py-4 w-[15%]"><Skeleton className="h-4 w-20 rounded" /></th>
                        <th className="px-4 py-4 w-[10%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-4 py-4 w-[10%]"><Skeleton className="h-4 w-16 rounded" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {[1, 2, 3, 4, 5].map((row) => (
                        <tr key={row}>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5 w-24 rounded font-mono" />
                            </td>
                            <td className="px-4 py-4.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="w-7 h-7 rounded-md shrink-0" />
                                    <Skeleton className="h-4 w-16 rounded" />
                                </div>
                            </td>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5 w-32 rounded" />
                            </td>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5.5 w-16 rounded-full" />
                            </td>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5 w-24 rounded" />
                            </td>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5 w-12 rounded" />
                            </td>
                            <td className="px-4 py-4.5">
                                <Skeleton className="h-5 w-12 rounded" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* Pagination */}
        <div className="pt-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
            </div>
        </div>
    </div>
);

export const ReviewProcessingSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
            </div>

            {/* Batch Size Configuration */}
            <BatchConfigSkeleton />

            {/* Duplication Management */}
            <DuplicationSkeleton />

            {/* Job Status Table */}
            <JobStatusTableSkeleton />
        </div>
    );
};

export default ReviewProcessingSkeleton;
