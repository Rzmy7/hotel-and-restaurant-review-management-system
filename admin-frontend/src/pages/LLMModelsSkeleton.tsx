import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const ModelLibrarySkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-3.5 w-64 rounded mt-1.5" />
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700/50">
                        {['Name', 'Endpoint', 'Model ID', 'Max Tokens', 'Status', 'Actions'].map((_, i) => (
                            <th key={i} className="px-6 py-3">
                                <Skeleton className="h-3.5 w-16 rounded" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                    {[1, 2, 3].map((row) => (
                        <tr key={row}>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-32 rounded" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-48 rounded font-mono" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-40 rounded font-mono" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5.5 w-16 rounded-full" /></td>
                            <td className="px-6 py-4">
                                <div className="flex gap-2">
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const ModelAssignmentsSkeleton = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden space-y-4">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
            <Skeleton className="h-5 w-44 rounded" />
            <Skeleton className="h-3.5 w-64 rounded mt-1.5" />
        </div>
        <div className="p-6 space-y-5">
            {[1, 2].map((i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="sm:w-56 shrink-0 space-y-1.5">
                        <Skeleton className="h-4.5 w-36 rounded" />
                        <Skeleton className="h-3 w-48 rounded" />
                    </div>
                    <Skeleton className="h-10 flex-1 rounded-xl" />
                </div>
            ))}
            <div className="flex items-center gap-3 pt-2">
                <Skeleton className="w-40 h-10 rounded-xl" />
            </div>
        </div>
    </div>
);

export const LLMModelsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans animate-shimmer">
            {/* Model Library */}
            <ModelLibrarySkeleton />

            {/* Model Assignments */}
            <ModelAssignmentsSkeleton />
        </div>
    );
};

export default LLMModelsSkeleton;
