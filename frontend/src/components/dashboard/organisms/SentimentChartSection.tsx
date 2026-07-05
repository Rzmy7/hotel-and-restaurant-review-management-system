import React from 'react';
import { useSentimentChart } from '../../../hooks/useSentimentChart';
import { SentimentChart } from './SentimentChart';
import Skeleton from '../../shared/Skeleton';

const ChartSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-[380px] flex flex-col gap-4 animate-pulse">
        <div className="flex justify-between items-center">
            <Skeleton className="w-1/3 h-6 rounded" />
            <Skeleton className="w-24 h-6 rounded" />
        </div>
        <Skeleton className="flex-1 w-full rounded-xl" />
        <div className="flex justify-between gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-4 flex-1 rounded" />
            ))}
        </div>
    </div>
);

interface SentimentChartSectionProps {
    period: number;
}

export const SentimentChartSection: React.FC<SentimentChartSectionProps> = ({ period }) => {
    const { data: sentiment, loading, error } = useSentimentChart(period);

    if (loading || !sentiment) {
        return <ChartSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-[380px] flex items-center justify-center text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load sentiment distribution: {error}</p>
            </div>
        );
    }

    return <SentimentChart data={sentiment} />;
};

export default SentimentChartSection;
