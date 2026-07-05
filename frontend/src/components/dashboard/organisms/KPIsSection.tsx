import React from 'react';
import { Star, Link2, MessageSquare, Frown } from 'lucide-react';
import { useDashboardKPIs } from '../../../hooks/useDashboardKPIs';
import { MetricCard } from '../molecules/MetricCard';
import Skeleton from '../../shared/Skeleton';

interface KPIsSectionProps {
    period: number;
}

const MetricCardSkeleton: React.FC = () => (
    <div className="p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl relative overflow-hidden flex items-start gap-4 shadow-sm animate-pulse">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-3">
            <Skeleton className="h-3 w-1/2 rounded" />
            <Skeleton className="h-8 w-1/3 rounded-lg" />
        </div>
    </div>
);

export const KPIsSection: React.FC<KPIsSectionProps> = ({ period }) => {
    const { data: metrics, loading, error } = useDashboardKPIs(period);

    if (loading || !metrics) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
                <MetricCardSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load KPI metrics: {error}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
            <MetricCard
                icon={<Star size={20} />}
                label="Average Rating"
                {...metrics.avgRating}
            />
            <MetricCard
                icon={<Link2 size={20} />}
                label="All Sources"
                {...metrics.activeSources}
            />
            <MetricCard
                icon={<MessageSquare size={20} />}
                label="Total Reviews"
                {...metrics.totalReviews}
            />
            <MetricCard
                icon={<Frown size={20} />}
                label="Negative Reviews"
                {...metrics.negativeReviews}
            />
        </div>
    );
};

export default KPIsSection;
