import React from 'react';
import Skeleton from '../components/shared/Skeleton';

const GroupCardSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col justify-between h-[132px] overflow-hidden">
        <div className="flex items-start gap-4">
            {/* Avatar icon skeleton */}
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            
            <div className="flex-1 min-w-0 space-y-2">
                {/* Title and tags skeleton */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-5 w-32 rounded" />
                    <Skeleton className="h-4.5 w-14 rounded-md" />
                    <Skeleton className="h-4.5 w-14 rounded-md" />
                </div>
                {/* Description skeleton */}
                <Skeleton className="h-4 w-full rounded mt-1" />
                {/* Meta row skeleton */}
                <div className="flex items-center gap-4 pt-1">
                    <Skeleton className="h-3.5 w-20 rounded" />
                    <Skeleton className="h-3.5 w-24 rounded" />
                </div>
            </div>
            
            {/* Arrow icon skeleton */}
            <Skeleton className="w-4.5 h-4.5 rounded-full shrink-0 mt-1" />
        </div>
    </div>
);

const GroupsSkeleton: React.FC = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Sticky Header Skeleton */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-32 rounded-md" />
                        <Skeleton className="h-5 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="w-24 h-10 rounded-xl" />
                    <Skeleton className="w-32 h-10 rounded-xl" />
                </div>
            </header>

            {/* Main Content Skeleton */}
            <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto space-y-8">
                {/* Groups I Own Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4 rounded-full" />
                        <Skeleton className="h-4 w-28 rounded" />
                        <Skeleton className="h-4 w-8 rounded-md" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <GroupCardSkeleton />
                        <GroupCardSkeleton />
                        <GroupCardSkeleton />
                    </div>
                </section>

                {/* Groups I'm a Member Of Section */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-4 h-4 rounded-full" />
                        <Skeleton className="h-4 w-24 rounded" />
                        <Skeleton className="h-4 w-8 rounded-md" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <GroupCardSkeleton />
                        <GroupCardSkeleton />
                        <GroupCardSkeleton />
                    </div>
                </section>
            </main>
        </div>
    );
};

export default GroupsSkeleton;
