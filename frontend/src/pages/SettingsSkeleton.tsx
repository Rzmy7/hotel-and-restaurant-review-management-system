import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const SettingsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col relative pb-24 transition-colors duration-300">

            {/* ── Header ── matches SettingsTemplate header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-52 rounded-md" />
                    <Skeleton className="h-3.5 w-72 rounded" />
                </div>
            </header>

            {/* ── Main Content — max-w-[1200px] matches updated template ── */}
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-8 py-6">
                <div className="flex flex-col gap-6">

                    {/* ── Tab nav — bottom-border underline style ── */}
                    <nav className="flex flex-wrap lg:flex-nowrap items-center w-full border-b border-gray-100 dark:border-slate-800/50 gap-1.5 lg:gap-0 pb-1.5 lg:pb-0">
                        {[160, 96, 128, 120, 172].map((w, i) => (
                            <div key={i} className="px-5 py-3.5 shrink-0">
                                <Skeleton className={`h-4 rounded`} style={{ width: w }} />
                            </div>
                        ))}
                    </nav>

                    {/* ── Content Card — responsive padding, min-h-[520px] ── */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-6 md:p-8 lg:p-10 min-h-[520px]">

                        {/* Active tab header: icon + title */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-slate-700/50">
                            <Skeleton className="w-10 h-10 rounded-xl" />
                            <Skeleton className="h-5 w-44 rounded-md" />
                        </div>

                        {/* ── General Properties tab body skeleton ── */}
                        {/* Owned Organizations row */}
                        <div className="flex flex-col gap-6">
                            <div className="flex items-start gap-8 py-5 border-b border-gray-100 dark:border-slate-700/40">
                                <div className="w-48 shrink-0 space-y-1.5">
                                    <Skeleton className="h-4 w-40 rounded" />
                                    <Skeleton className="h-3 w-52 rounded" />
                                </div>
                                <div className="flex-1 max-w-[600px] border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
                                    {[0, 1].map((i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0"
                                        >
                                            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-1.5">
                                                <Skeleton className="h-3.5 w-36 rounded" />
                                                <Skeleton className="h-2.5 w-20 rounded" />
                                            </div>
                                            <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time Zone row */}
                            <div className="flex items-center gap-8 py-5 border-b border-gray-100 dark:border-slate-700/40">
                                <Skeleton className="h-4 w-24 rounded shrink-0" style={{ minWidth: '12rem' }} />
                                <Skeleton className="h-11 w-full max-w-[320px] rounded-xl" />
                            </div>

                            {/* Language row */}
                            <div className="flex items-center gap-8 py-5 border-b border-gray-100 dark:border-slate-700/40">
                                <Skeleton className="h-4 w-24 rounded shrink-0" style={{ minWidth: '12rem' }} />
                                <Skeleton className="h-11 w-full max-w-[320px] rounded-xl" />
                            </div>

                            {/* Application Theme row */}
                            <div className="flex items-center gap-8 py-5">
                                <div className="shrink-0 space-y-1.5" style={{ minWidth: '12rem' }}>
                                    <Skeleton className="h-4 w-36 rounded" />
                                    <Skeleton className="h-3 w-48 rounded" />
                                </div>
                                <Skeleton className="h-11 w-[280px] rounded-xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── Sticky Footer ── matches SettingsTemplate footer */}
            <div
                className="fixed bottom-0 right-0 left-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-8 py-4 flex gap-4 justify-end"
                style={{ left: 'var(--sidebar-width, 260px)' }}
            >
                <Skeleton className="w-36 h-10 rounded-xl" />
                <Skeleton className="w-28 h-10 rounded-xl" />
            </div>
        </div>
    );
};

export default SettingsSkeleton;
