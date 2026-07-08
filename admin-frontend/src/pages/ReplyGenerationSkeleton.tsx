import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const HeaderSkeleton = () => (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 flex-1">
                <Skeleton className="h-6 w-56 rounded" />
                <Skeleton className="h-4 w-96 rounded max-w-full" />
            </div>
            <Skeleton className="w-40 h-8 rounded-full shrink-0" />
        </div>
    </section>
);

const MainSectionSkeleton = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
            {/* Assigned Model Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-900/10 p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-5 w-40 rounded" />
                            <Skeleton className="h-3.5 w-72 rounded max-w-full" />
                        </div>
                        <Skeleton className="w-32 h-8 rounded-lg shrink-0" />
                    </div>
                </div>
            </div>

            {/* Embedding Context Controls */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-52 rounded" />
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-40 rounded" />
                                <Skeleton className="w-10 h-6 rounded-full" />
                            </div>
                            <Skeleton className="h-3.5 w-60 rounded" />
                        </div>
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-32 rounded" />
                                <Skeleton className="w-10 h-6 rounded-full" />
                            </div>
                            <Skeleton className="h-3.5 w-56 rounded" />
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2.5">
                        <Skeleton className="h-4.5 w-40 rounded" />
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-3.5 w-96 rounded max-w-full" />
                    </div>
                </div>
            </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-32 rounded" />
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 px-4 py-3 space-y-1.5">
                    <Skeleton className="h-3 w-28 rounded" />
                    <Skeleton className="h-7 w-12 rounded" />
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded" />
                    <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="w-full h-11 rounded-xl" />
            </div>
        </div>
    </div>
);

export const ReplyGenerationSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-4 font-sans">
            <HeaderSkeleton />
            <MainSectionSkeleton />

            {/* Save Footer Row */}
            <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <Skeleton className="h-4 w-80 rounded" />
                <Skeleton className="w-36 h-10 rounded-xl md:w-auto shrink-0" />
            </section>
        </div>
    );
};

export default ReplyGenerationSkeleton;
