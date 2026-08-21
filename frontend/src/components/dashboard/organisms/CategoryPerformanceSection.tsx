import React from 'react';
import { useCategoryPerformance } from '../../../hooks/useCategoryPerformance';
import { CategoryPerformance } from './CategoryPerformance';
import Skeleton from '../../shared/Skeleton';

const CategorySkeletonItem: React.FC = () => (
    <div className="flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-2.5 w-16 rounded" />
                </div>
            </div>
            <div className="text-right space-y-1.5">
                <Skeleton className="h-3.5 w-8 ml-auto rounded" />
                <Skeleton className="h-2.5 w-12 ml-auto rounded" />
            </div>
        </div>
        <Skeleton className="w-full h-2 rounded-full" />
    </div>
);

const CategoryPerformanceSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex flex-col gap-6 animate-pulse">
        <div className="flex justify-between items-center mb-2">
            <div className="space-y-1.5 flex-1">
                <Skeleton className="w-1/3 h-5 rounded" />
                <Skeleton className="w-1/4 h-3.5 rounded mt-1" />
            </div>
            <Skeleton className="w-16 h-6 rounded-md" />
        </div>
        <div className="flex flex-col gap-6 flex-1">
            <CategorySkeletonItem />
            <CategorySkeletonItem />
            <CategorySkeletonItem />
            <CategorySkeletonItem />
        </div>
    </div>
);

interface CategoryPerformanceSectionProps {
    period: number;
}

export const CategoryPerformanceSection: React.FC<CategoryPerformanceSectionProps> = ({ period }) => {
    const { data: categories, loading, error } = useCategoryPerformance(period);

    if (loading) {
        return <CategoryPerformanceSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex items-center justify-center text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load aspect performance: {error}</p>
            </div>
        );
    }

    return <CategoryPerformance categories={categories} />;
};

export default CategoryPerformanceSection;
