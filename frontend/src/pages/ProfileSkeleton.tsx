import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const ProfileSkeleton: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#fcfcfd] dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-6 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-48 rounded" />
                        <Skeleton className="h-5 w-16 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-64 rounded" />
                </div>
                <div className="flex items-center gap-4 max-md:hidden text-right">
                    <div className="text-right flex flex-col items-end space-y-2">
                        <Skeleton className="h-3 w-24 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-[1200px] mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
                    {/* Left: Interactive Form */}
                    <div className="w-full order-2 lg:order-1 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/50 p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-100 dark:border-slate-700/50">
                                <Skeleton className="h-10 w-10 rounded-xl" />
                                <div>
                                    <Skeleton className="h-6 w-40 rounded mb-2" />
                                    <Skeleton className="h-4 w-56 rounded" />
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24 rounded" />
                                        <Skeleton className="h-11 w-full rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-24 rounded" />
                                    <Skeleton className="h-24 w-full rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Identity Sidebar */}
                    <div className="w-full order-1 lg:order-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/50 p-8 shadow-sm flex flex-col items-center">
                            <Skeleton className="w-32 h-32 rounded-full mb-6" />
                            <Skeleton className="h-6 w-48 rounded mb-2" />
                            <Skeleton className="h-4 w-32 rounded mb-6" />
                            
                            <div className="w-full space-y-4 pt-6 border-t border-gray-100 dark:border-slate-700/50">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                    <Skeleton className="h-4 w-full rounded" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="w-8 h-8 rounded-lg" />
                                    <Skeleton className="h-4 w-full rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfileSkeleton;
