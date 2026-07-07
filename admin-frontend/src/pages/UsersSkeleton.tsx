import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full space-y-4">
        <div className="flex justify-between items-start">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
        </div>
        <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-3.5 w-24 rounded" />
        </div>
    </div>
);

const FiltersSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            <Skeleton className="h-11 w-full md:max-w-xl rounded-xl" />
            <div className="flex gap-4">
                <Skeleton className="h-11 w-28 rounded-xl" />
                <Skeleton className="h-11 w-32 rounded-xl" />
                <Skeleton className="h-11 w-28 rounded-xl" />
            </div>
        </div>
        <Skeleton className="h-11 w-36 rounded-xl animate-none" />
    </div>
);

const TableSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 w-[25%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[30%]"><Skeleton className="h-4 w-20 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-12 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-12 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                    {[1, 2, 3, 4, 5, 6].map((row) => (
                        <tr key={row}>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-10 h-10 rounded-full" />
                                    <Skeleton className="h-4 w-28 rounded" />
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-4 w-44 rounded" />
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-4 w-16 rounded" />
                            </td>
                            <td className="px-6 py-4">
                                <Skeleton className="h-5.5 w-16 rounded-full" />
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2">
                                    <Skeleton className="w-16 h-8 rounded-lg" />
                                    <Skeleton className="w-16 h-8 rounded-lg" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
            </div>
        </div>
    </div>
);

export const UsersSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </div>

            {/* Filters Row */}
            <FiltersSkeleton />

            {/* Table */}
            <TableSkeleton />
        </div>
    );
};

export default UsersSkeleton;
