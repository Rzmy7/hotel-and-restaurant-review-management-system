import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const MetricCardSkeleton: React.FC = () => (
    <div className="flex items-center gap-3.5 p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm">
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24 rounded" />
            <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-16 rounded-md" />
                <Skeleton className="h-6 w-12 rounded-md" />
            </div>
        </div>
    </div>
);

const InsightsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            {/* Header Skeleton */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="space-y-1">
                    <Skeleton className="w-32 h-6 rounded" />
                    <Skeleton className="w-64 h-3.5 rounded" />
                </div>
                {/* Time range selector pills skeleton */}
                <div className="flex bg-gray-100 dark:bg-slate-800/80 rounded-lg p-1 w-80 h-10">
                    <Skeleton className="flex-1 h-full rounded-md" />
                    <Skeleton className="flex-1 h-full rounded-md mx-1" />
                    <Skeleton className="flex-1 h-full rounded-md" />
                </div>
            </div>

            <div className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
                {/* ═══ 1. KPI METRICS ROW ═══════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1000px]:grid-cols-4 gap-4">
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                    <MetricCardSkeleton />
                </div>

                {/* ═══ 2. SENTIMENT OVER TIME ════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <Skeleton className="h-5 w-48 rounded" />
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                <Skeleton className="h-3 w-12 rounded" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                <Skeleton className="h-3 w-12 rounded" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                <Skeleton className="h-3 w-12 rounded" />
                            </div>
                        </div>
                    </div>
                    {/* Simulated line chart area */}
                    <div className="h-[200px] border border-gray-100 dark:border-slate-700/50 rounded-lg p-4 flex items-end">
                        <div className="w-full h-full relative flex items-end gap-2">
                            {/* Horizontal grid guide lines */}
                            <div className="absolute inset-x-0 top-1/4 border-t border-gray-100 dark:border-slate-700/40" />
                            <div className="absolute inset-x-0 top-2/4 border-t border-gray-100 dark:border-slate-700/40" />
                            <div className="absolute inset-x-0 top-3/4 border-t border-gray-100 dark:border-slate-700/40" />
                            
                            {/* Smooth height block for shimmer graphic */}
                            <Skeleton className="w-full h-full rounded-lg opacity-40" />
                        </div>
                    </div>
                    {/* Month/Week labels below chart */}
                    <div className="grid grid-cols-4 text-center gap-2">
                        <Skeleton className="h-3 w-12 mx-auto rounded" />
                        <Skeleton className="h-3 w-12 mx-auto rounded" />
                        <Skeleton className="h-3 w-12 mx-auto rounded" />
                        <Skeleton className="h-3 w-12 mx-auto rounded" />
                    </div>
                </div>

                {/* ═══ 3 + 4. RATING DISTRIBUTION + CATEGORY PERFORMANCE ═════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Rating Distribution Skeleton */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-5">
                        <Skeleton className="h-5 w-44 rounded" />
                        <div className="flex flex-col gap-4">
                            {[5, 4, 3, 2, 1].map((stars) => (
                                <div key={stars} className="grid grid-cols-[60px_1fr_70px] items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Skeleton className="w-3.5 h-3.5 rounded-full" />
                                        <Skeleton className="h-3.5 w-6 rounded" />
                                    </div>
                                    <Skeleton className="w-full h-3 rounded-full" />
                                    <Skeleton className="h-4 w-10 ml-auto rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-5 w-10 rounded" />
                        </div>
                    </div>

                    {/* Category Performance Skeleton */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                        <Skeleton className="h-5 w-48 rounded" />
                        <div className="flex flex-col gap-4.5">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="grid grid-cols-[100px_1fr_80px] items-center gap-3">
                                    <Skeleton className="h-4 w-16 rounded" />
                                    <Skeleton className="w-full h-2.5 rounded-full" />
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <Skeleton className="h-4 w-10 rounded" />
                                        <Skeleton className="h-3 w-6 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <Skeleton className="h-4 w-28 rounded" />
                            <Skeleton className="h-4 w-32 rounded" />
                        </div>
                    </div>
                </div>

                {/* ═══ 5. SOURCE BREAKDOWN ══════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-lg" />
                            <div className="space-y-1.5">
                                <Skeleton className="h-4.5 w-40 rounded" />
                                <Skeleton className="h-3 w-48 rounded" />
                            </div>
                        </div>
                        {/* Tab buttons skeleton */}
                        <div className="flex bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5 gap-0.5 border border-transparent dark:border-slate-600/50 w-36 h-7">
                            <Skeleton className="flex-1 h-full rounded-md" />
                            <Skeleton className="flex-1 h-full rounded-md" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-700/50">
                        {/* Column headers skeleton */}
                        <div className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 pb-2 mb-1">
                            <Skeleton className="h-3 w-16 rounded" />
                            <Skeleton className="h-3 w-10 mx-auto rounded" />
                            <Skeleton className="h-3 w-10 mx-auto rounded" />
                            <Skeleton className="h-3 w-16 ml-auto rounded" />
                        </div>

                        {/* 4 Source rows skeleton */}
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 items-center py-3">
                                <div className="flex items-center gap-2.5">
                                    <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                    <Skeleton className="h-4 w-28 rounded" />
                                </div>
                                <Skeleton className="h-4 w-8 mx-auto rounded" />
                                <Skeleton className="h-4 w-10 mx-auto rounded" />
                                <Skeleton className="h-2 w-16 ml-auto rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* ═══ 6. TOP KEYWORDS ═══════════════════════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Positive Keywords */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4 rounded-full" />
                            <Skeleton className="h-5 w-48 rounded" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-7 w-24 rounded-lg" />
                            <Skeleton className="h-7 w-20 rounded-lg" />
                            <Skeleton className="h-7 w-28 rounded-lg" />
                            <Skeleton className="h-7 w-16 rounded-lg" />
                            <Skeleton className="h-7 w-22 rounded-lg" />
                            <Skeleton className="h-7 w-18 rounded-lg" />
                        </div>
                    </div>

                    {/* Negative Keywords */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                            <Skeleton className="w-4 h-4 rounded-full" />
                            <Skeleton className="h-5 w-48 rounded" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-7 w-20 rounded-lg" />
                            <Skeleton className="h-7 w-24 rounded-lg" />
                            <Skeleton className="h-7 w-16 rounded-lg" />
                            <Skeleton className="h-7 w-28 rounded-lg" />
                            <Skeleton className="h-7 w-18 rounded-lg" />
                        </div>
                    </div>
                </div>

                {/* ═══ 7. RESPONSE METRICS + 8. HEATMAP ══════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Response Metrics */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-5">
                        <Skeleton className="h-5 w-36 rounded" />
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                    <Skeleton className="w-10 h-10 rounded-xl mb-3" />
                                    <Skeleton className="h-7 w-12 rounded mb-1" />
                                    <Skeleton className="h-3.5 w-20 rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-1 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
                            <Skeleton className="h-4 w-5/6 rounded" />
                            <Skeleton className="h-4 w-2/3 rounded" />
                        </div>
                    </div>

                    {/* Review Volume Heatmap */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-4">
                        <div className="flex justify-between items-center gap-3">
                            <Skeleton className="h-5 w-32 rounded" />
                            <Skeleton className="h-3.5 w-36 rounded" />
                        </div>
                        {/* Heatmap Grid Loading */}
                        <div className="flex gap-1.5">
                            <div className="flex flex-col gap-1 shrink-0 mr-1 justify-between h-28 py-0.5">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                    <span key={i} className="text-[10px] text-gray-300 font-bold h-3 flex items-center justify-end w-4">{day}</span>
                                ))}
                            </div>
                            <div className="flex gap-1 flex-1 py-0.5 justify-between">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((week) => (
                                    <div key={week} className="flex flex-col gap-1 justify-between">
                                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                            <Skeleton key={day} className="w-3.5 h-3.5 rounded-sm" />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-1 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <Skeleton className="h-4 w-20 rounded" />
                            <Skeleton className="h-4 w-40 rounded" />
                        </div>
                    </div>
                </div>

                {/* ═══ 9. AI RECOMMENDATIONS ═════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-5 flex flex-col gap-5">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4.5 w-44 rounded" />
                            <Skeleton className="h-3 w-64 rounded" />
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-start gap-3.5 p-4 rounded-xl border border-gray-100 dark:border-slate-700/60 bg-gray-50/50 dark:bg-slate-800/40">
                                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-5 w-14 rounded" />
                                        <Skeleton className="h-4 w-48 rounded" />
                                    </div>
                                    <Skeleton className="h-3.5 w-5/6 rounded" />
                                    <Skeleton className="h-3.5 w-2/3 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightsSkeleton;
