import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const StatCardSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between h-[102px]">
        <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-7 w-20 rounded-md" />
        </div>
        <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
    </div>
);

const FiltersSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Skeleton className="h-10 w-full md:w-80 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
    </div>
);

const TableSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
        <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-900/50">
                        <th className="px-6 py-4 w-[30%]"><Skeleton className="h-4 w-32 rounded" /></th>
                        <th className="px-6 py-4 w-[25%]"><Skeleton className="h-4 w-24 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[15%]"><Skeleton className="h-4 w-16 rounded" /></th>
                        <th className="px-6 py-4 w-[15%] text-center"><Skeleton className="h-4 w-16 mx-auto rounded" /></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {[1, 2, 3, 4, 5, 6].map((row) => (
                        <tr key={row}>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-48 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-32 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-12 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <Skeleton className="h-5 w-16 rounded" />
                            </td>
                            <td className="px-6 py-4.5">
                                <div className="flex justify-center items-center gap-3">
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
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
            <Skeleton className="h-4 w-36 rounded" />
            <div className="flex gap-2">
                <Skeleton className="w-8 h-8 rounded-md" />
                <Skeleton className="w-8 h-8 rounded-md" />
            </div>
        </div>
    </div>
);

export const OrganizationsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

export default OrganizationsSkeleton;
