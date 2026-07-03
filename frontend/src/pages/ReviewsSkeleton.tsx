import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const MetricCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 relative overflow-hidden flex flex-col justify-between h-[116px]">
        <div className="flex justify-between items-center mb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-16 h-4 rounded-full" />
        </div>
        <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
    </div>
);

const ReviewsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
            {/* Header Skeleton */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-64 rounded-md" />
                        <Skeleton className="h-5 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-96 rounded" />
                </div>
                {/* Header actions skeleton */}
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="w-32 h-10 rounded-xl" />
                    <Skeleton className="w-28 h-10 rounded-xl" />
                </div>
            </header>

            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
                {/* Stats Row Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* Filters Toolbar Skeleton */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    {/* Search and Content search skeleton */}
                    <div className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-2">
                        <Skeleton className="h-10 w-full md:w-96 rounded-xl" />
                        <Skeleton className="h-10 w-28 rounded-xl" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>

                    {/* Filter buttons skeleton */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-9 w-24 rounded-xl" />
                        ))}
                        <Skeleton className="h-4 w-32 rounded ml-2" />
                    </div>
                </div>

                {/* Table Layout Skeleton */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col min-h-[500px]">
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700/50">
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-40 rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-20 rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-4 w-16 rounded" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {[1, 2, 3, 4, 5, 6].map((row) => (
                                    <tr key={row}>
                                        {/* Source */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-2.5">
                                                <Skeleton className="w-5 h-5 rounded-full" />
                                                <Skeleton className="h-4 w-24 rounded" />
                                            </div>
                                        </td>
                                        {/* Reviewer */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-3">
                                                <Skeleton className="w-8 h-8 rounded-full" />
                                                <div className="space-y-1">
                                                    <Skeleton className="h-3.5 w-24 rounded" />
                                                    <Skeleton className="h-3 w-16 rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        {/* Rating */}
                                        <td className="px-6 py-4.5">
                                            <div className="flex items-center gap-0.5">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Skeleton key={star} className="w-3.5 h-3.5 rounded-full" />
                                                ))}
                                            </div>
                                        </td>
                                        {/* Review text */}
                                        <td className="px-6 py-4.5">
                                            <div className="space-y-2 max-w-lg">
                                                <Skeleton className="h-3.5 w-full rounded" />
                                                <Skeleton className="h-3 w-2/3 rounded" />
                                            </div>
                                        </td>
                                        {/* Sentiment */}
                                        <td className="px-6 py-4.5">
                                            <Skeleton className="h-5.5 w-16 rounded-full" />
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-4.5">
                                            <Skeleton className="h-5.5 w-14 rounded-full" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Row Skeleton */}
                    <div className="mt-auto px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                        <Skeleton className="h-4 w-48 rounded" />
                        <div className="flex gap-2">
                            <Skeleton className="w-8 h-8 rounded-md" />
                            <Skeleton className="w-8 h-8 rounded-md" />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReviewsSkeleton;
