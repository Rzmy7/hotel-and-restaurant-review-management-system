import React from 'react';
import { useLatestReviews } from '../../../hooks/useLatestReviews';
import { LatestReviews } from './LatestReviews';
import Skeleton from '../../shared/Skeleton';

interface LatestReviewsSectionProps {
    period: number;
}

const LatestReviewsSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex flex-col gap-4 animate-pulse">
        <div className="flex justify-between items-center mb-2">
            <div className="space-y-2 flex-1">
                <Skeleton className="w-1/3 h-5 rounded" />
                <Skeleton className="w-1/4 h-3 rounded" />
            </div>
            <Skeleton className="w-16 h-8 rounded-lg" />
        </div>
        <div className="space-y-4 flex-1 overflow-hidden">
            {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border border-gray-50 dark:border-slate-700 rounded-lg space-y-3">
                    <div className="flex justify-between">
                        <Skeleton className="w-24 h-4 rounded" />
                        <Skeleton className="w-12 h-3 rounded" />
                    </div>
                    <Skeleton className="w-3/4 h-4 rounded" />
                    <Skeleton className="w-1/2 h-3 rounded" />
                </div>
            ))}
        </div>
    </div>
);

export const LatestReviewsSection: React.FC<LatestReviewsSectionProps> = ({ period }) => {
    const { data: reviews, loading, error } = useLatestReviews(period);

    if (loading) {
        return <LatestReviewsSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex items-center justify-center text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load latest reviews: {error}</p>
            </div>
        );
    }

    return <LatestReviews reviews={reviews} />;
};

export default LatestReviewsSection;
