import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const ReviewDetailSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            {/* Header bar */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 md:px-8 py-3">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Skeleton className="h-5 w-32 rounded" />
                    <Skeleton className="h-5 w-24 rounded" />
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:px-8 md:py-6">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

                    {/* ── LEFT: Review Content ─────────────────────────── */}
                    <div className="space-y-5">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 md:p-6">
                            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-64 rounded" />
                                    <Skeleton className="h-4 w-40 rounded" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-20 rounded-md" />
                                    <Skeleton className="h-6 w-16 rounded-md" />
                                </div>
                            </div>

                            <Skeleton className="h-5 w-32 rounded mb-4" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-24 rounded" />
                                <Skeleton className="h-4 w-32 rounded" />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 md:p-6 space-y-3">
                            <Skeleton className="h-4 w-32 rounded mb-4" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-full rounded" />
                            <Skeleton className="h-4 w-3/4 rounded" />
                        </div>
                    </div>

                    {/* ── RIGHT: AI Reply Editor ───────────────────────── */}
                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 sticky top-20">
                            <div className="flex items-center gap-3 mb-4">
                                <Skeleton className="w-8 h-8 rounded-lg" />
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32 rounded" />
                                    <Skeleton className="h-3 w-24 rounded" />
                                </div>
                            </div>

                            <div className="flex gap-2 mb-4">
                                <Skeleton className="h-8 w-full rounded-lg" />
                                <Skeleton className="h-8 w-full rounded-lg" />
                            </div>

                            <Skeleton className="h-10 w-full rounded-lg mb-4" />
                            <Skeleton className="h-48 w-full rounded-lg mb-4" />

                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-full rounded-lg" />
                                <Skeleton className="h-9 w-full rounded-lg" />
                            </div>
                            <Skeleton className="h-9 w-full rounded-lg mt-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewDetailSkeleton;
