import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const CompetitorsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header Skeleton */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-8 w-48 rounded-md" />
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto">
                {/* Competitor List Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    {/* Card Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <Skeleton className="h-6 w-36 rounded-md" />
                        <div className="flex items-center gap-3">
                            <Skeleton className="w-32 h-10 rounded-lg" />
                            <Skeleton className="w-36 h-10 rounded-lg" />
                        </div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4 w-[25%]"><Skeleton className="h-4 w-28 rounded" /></th>
                                    <th className="px-6 py-4 w-[20%]"><Skeleton className="h-4 w-20 rounded" /></th>
                                    <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                                    <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-24 rounded" /></th>
                                    <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-20 rounded" /></th>
                                    <th className="px-6 py-4 w-[10%] text-center"><Skeleton className="h-4 w-12 mx-auto rounded" /></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {[1, 2, 3, 4, 5].map((row) => (
                                    <tr key={row} className="hover:bg-gray-50/30 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <Skeleton className="h-5 w-40 rounded" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <Skeleton className="h-5 w-32 rounded" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <Skeleton className="h-5 w-8 rounded" />
                                                <Skeleton className="w-4 h-4 rounded-full" />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <Skeleton className="h-5 w-12 rounded" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <Skeleton className="h-5 w-16 rounded" />
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-3">
                                                <Skeleton className="w-20 h-8 rounded-lg" />
                                                <Skeleton className="w-6 h-6 rounded" />
                                                <Skeleton className="w-6 h-6 rounded" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CompetitorsSkeleton;
