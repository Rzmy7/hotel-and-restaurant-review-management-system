import React from 'react';
import { useDashboardKPIs } from '../../../hooks/useDashboardKPIs';
import ReviewRatingDistribution from '../../reviews/ReviewRatingDistribution';
import Skeleton from '../../shared/Skeleton';

const ReviewRatingDistributionSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-6 flex flex-col shadow-sm animate-pulse h-full">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1">
                    <Skeleton className="w-32 h-4 rounded" />
                    <Skeleton className="w-20 h-3 rounded" />
                </div>
            </div>
            <Skeleton className="w-24 h-8 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3.5 flex-1">
            {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3 w-full">
                    <Skeleton className="h-4 w-8 rounded" />
                    <Skeleton className="flex-1 h-2.5 rounded-full" />
                    <Skeleton className="h-4 w-16 rounded" />
                </div>
            ))}
        </div>
    </div>
);

interface ReviewRatingDistributionSectionProps {
    period: number;
}

export const ReviewRatingDistributionSection: React.FC<ReviewRatingDistributionSectionProps> = ({ period }) => {
    const { data: metrics, loading, error } = useDashboardKPIs(period);

    if (loading || !metrics) {
        return <ReviewRatingDistributionSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl p-6 flex items-center justify-center text-center h-[280px]">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load rating distribution: {error}</p>
            </div>
        );
    }

    return <ReviewRatingDistribution distribution={metrics.ratingDistribution} />;
};

export default ReviewRatingDistributionSection;
