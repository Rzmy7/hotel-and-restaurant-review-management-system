import React from 'react';
import { useSourceComparison } from '../../../hooks/useSourceComparison';
import SourceComparison from '../../shared/SourceComparison';
import Skeleton from '../../shared/Skeleton';

const SourceCardSkeletonItem: React.FC<{ isCompact?: boolean }> = ({ isCompact }) => (
    <div className={`p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50/20 dark:bg-slate-800/20 space-y-4`}>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                <Skeleton className="w-3 h-3 rounded-[4px]" />
                <Skeleton className="h-3.5 w-24 rounded" />
            </div>
            <Skeleton className="h-5 w-8 rounded" />
        </div>
        <div className="space-y-3">
            <div className="flex items-baseline justify-between border-b border-black/5 pb-1">
                <Skeleton className="h-5 w-10 rounded" />
                {!isCompact && <Skeleton className="h-3 w-16 rounded" />}
            </div>
            <div className="space-y-2">
                <Skeleton className="w-full h-1.5 rounded-full" />
                <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-2 w-10 rounded" />
                        <Skeleton className="h-2 w-12 rounded" />
                    </div>
                    <Skeleton className="w-full h-1 rounded-full" />
                </div>
            </div>
        </div>
    </div>
);

const SourceComparisonSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-6 shadow-sm overflow-hidden relative animate-pulse">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 border-b border-gray-50 dark:border-slate-700/50 pb-8">
            <div className="space-y-1.5 flex-1">
                <Skeleton className="w-1/4 h-5 rounded" />
                <Skeleton className="w-1/3 h-3.5 rounded mt-1" />
            </div>
            <Skeleton className="w-40 h-8 rounded-xl mt-4 sm:mt-0" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr] gap-12 items-center">
            <div className="flex flex-col items-center">
                <div className="w-[200px] h-[200px] rounded-full border-[18px] border-gray-50 dark:border-slate-700 flex items-center justify-center relative">
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <Skeleton className="w-16 h-8 rounded" />
                        <Skeleton className="w-12 h-3 rounded" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <SourceCardSkeletonItem isCompact />
                <SourceCardSkeletonItem isCompact />
                <SourceCardSkeletonItem isCompact />
            </div>
        </div>
    </div>
);

interface SourceComparisonSectionProps {
    period: number;
}

export const SourceComparisonSection: React.FC<SourceComparisonSectionProps> = ({ period }) => {
    const { data: sources, loading, error } = useSourceComparison(period);

    if (loading) {
        return <SourceComparisonSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm flex items-center justify-center text-center h-[340px]">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load source comparison: {error}</p>
            </div>
        );
    }

    return <SourceComparison sources={sources} />;
};

export default SourceComparisonSection;
