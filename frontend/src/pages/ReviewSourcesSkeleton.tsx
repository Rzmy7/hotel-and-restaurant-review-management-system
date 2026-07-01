import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const SourceStatsSkeleton: React.FC = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map((i) => (
            <div
                key={i}
                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col justify-between h-[116px] relative overflow-hidden"
            >
                <div className="flex justify-between items-center mb-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    {i === 2 && <Skeleton className="w-12 h-4.5 rounded-full" />}
                </div>
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
            </div>
        ))}
    </div>
);

const ReviewSourcesSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-[#F9FAFB] dark:bg-[#121826] flex flex-col">
            {/* Header Skeleton */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800/80 px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-48 rounded-md" />
                        <Skeleton className="h-5 w-24 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-80 rounded" />
                </div>
                {/* Header actions skeleton */}
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="w-24 h-10 rounded-xl" />
                    <Skeleton className="w-36 h-10 rounded-xl" />
                </div>
            </header>

            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
                {/* Stats Section Skeleton */}
                <SourceStatsSkeleton />

                {/* Filters Toolbar Skeleton */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    {/* Search skeleton */}
                    <div className="w-full md:w-96">
                        <Skeleton className="h-10 w-full rounded-xl" />
                    </div>

                    {/* Filter buttons skeleton */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="flex bg-gray-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-gray-100 dark:border-slate-700 gap-1">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-7 w-20 rounded-lg" />
                            ))}
                        </div>
                        <Skeleton className="h-10 w-10 rounded-xl" />
                    </div>
                </div>

                {/* Table Layout Skeleton */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100/50 dark:border-slate-700/50">
                                    <th className="px-6 py-4"><Skeleton className="h-3.5 w-16 rounded" /></th>
                                    <th className="px-6 py-4 text-center"><Skeleton className="h-3.5 w-14 mx-auto rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-3.5 w-20 rounded" /></th>
                                    <th className="px-6 py-4 text-center"><Skeleton className="h-3.5 w-16 mx-auto rounded" /></th>
                                    <th className="px-6 py-4"><Skeleton className="h-3.5 w-24 rounded" /></th>
                                    <th className="px-6 py-4 text-right"><Skeleton className="h-3.5 w-14 ml-auto rounded" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {[1, 2, 3, 4, 5].map((row) => (
                                    <tr key={row}>
                                        {/* Platform */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <Skeleton className="w-9 h-9 rounded-xl" />
                                                <div className="space-y-1.5">
                                                    <Skeleton className="h-4 w-28 rounded" />
                                                    <Skeleton className="h-3 w-20 rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        {/* Status */}
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <Skeleton className="h-6 w-20 rounded-lg" />
                                            </div>
                                        </td>
                                        {/* Last Sync */}
                                        <td className="px-6 py-5">
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-3.5 w-24 rounded" />
                                                <Skeleton className="h-3 w-16 rounded" />
                                            </div>
                                        </td>
                                        {/* Frequency */}
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <Skeleton className="h-6 w-20 rounded-full" />
                                            </div>
                                        </td>
                                        {/* Success Rate */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 max-w-[120px]">
                                                <Skeleton className="h-2 w-full rounded-full" />
                                                <Skeleton className="h-3 w-8 rounded" />
                                            </div>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Skeleton className="w-8 h-8 rounded-xl" />
                                                <Skeleton className="w-8 h-8 rounded-xl" />
                                                <Skeleton className="w-8 h-8 rounded-xl" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Row Skeleton */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between bg-white dark:bg-slate-800">
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

export default ReviewSourcesSkeleton;
