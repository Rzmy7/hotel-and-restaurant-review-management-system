import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const SettingsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col relative pb-24 transition-colors duration-300">
            {/* Header Skeleton */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-7 w-56 rounded-md" />
                    <Skeleton className="h-4 w-72 rounded" />
                </div>
            </header>

            {/* Main Content Area Skeleton */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6 space-y-6">
                <div className="flex flex-col gap-6">
                    {/* Horizontal Tab Navigation Skeleton */}
                    <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-100 dark:border-slate-800/50">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-11 w-40 rounded-xl flex-shrink-0" />
                        ))}
                    </nav>

                    {/* Setting Cards Layout Skeleton */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Two Columns of Settings Options */}
                        <div className="xl:col-span-2 space-y-6">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6 md:p-8 space-y-6 shadow-sm">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48 rounded" />
                                    <Skeleton className="h-4 w-80 rounded" />
                                </div>
                                <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="h-11 w-full rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="h-11 w-full rounded-xl" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="h-11 w-full rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-28 rounded" />
                                            <Skeleton className="h-11 w-full rounded-xl" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Info/Preview Column Skeleton */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700/50 p-6 shadow-sm space-y-4 flex flex-col items-center text-center">
                                <Skeleton className="w-24 h-24 rounded-full" />
                                <div className="space-y-2 w-full flex flex-col items-center">
                                    <Skeleton className="h-5 w-32 rounded" />
                                    <Skeleton className="h-3.5 w-48 rounded" />
                                </div>
                                <Skeleton className="h-10 w-28 rounded-xl mt-2" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Sticky Action Footer Skeleton */}
            <div
                className="fixed bottom-0 right-0 left-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-8 py-4 flex gap-4 justify-end shadow-[0_-4px_24px_rgba(0,0,0,0.02)] transition-all duration-300"
                style={{ left: 'var(--sidebar-width, 260px)' }}
            >
                <Skeleton className="w-32 h-10 rounded-xl" />
                <Skeleton className="w-28 h-10 rounded-xl" />
            </div>
        </div>
    );
};

export default SettingsSkeleton;
