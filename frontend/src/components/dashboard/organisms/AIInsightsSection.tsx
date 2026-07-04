import React from 'react';
import { useAIInsights } from '../../../hooks/useAIInsights';
import { AIInsights } from './AIInsights';
import Skeleton from '../../shared/Skeleton';

const InsightItemSkeleton: React.FC = () => (
    <div className="p-3.5 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100/50 dark:border-slate-700/30 rounded-xl space-y-2">
        <div className="flex justify-between items-center">
            <Skeleton className="h-3.5 w-2/3 rounded" />
            <Skeleton className="h-3 w-4 rounded" />
        </div>
        <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
        </div>
    </div>
);

const AIInsightsSkeleton: React.FC = () => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex flex-col animate-pulse">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="space-y-1">
                    <Skeleton className="w-24 h-4 rounded" />
                    <Skeleton className="w-16 h-3 rounded" />
                </div>
            </div>
            <Skeleton className="w-24 h-4 rounded" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-1">
            {/* Strengths */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-1.5 h-1.5 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded" />
                </div>
                <div className="space-y-2.5">
                    <InsightItemSkeleton />
                    <InsightItemSkeleton />
                </div>
            </div>
            
            {/* Critical Issues */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <Skeleton className="h-3 w-20 rounded" />
                </div>
                <div className="space-y-2.5">
                    <InsightItemSkeleton />
                    <InsightItemSkeleton />
                </div>
            </div>
        </div>

        {/* AI Highlight */}
        <div className="p-5 bg-gray-50/50 dark:bg-slate-800/50 border border-gray-100/50 dark:border-slate-700/30 rounded-2xl space-y-3">
            <div className="flex items-center gap-2">
                <Skeleton className="w-6 h-6 rounded" />
                <Skeleton className="h-3.5 w-24 rounded" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-3.5 w-full rounded" />
                <Skeleton className="h-3.5 w-5/6 rounded" />
            </div>
            <Skeleton className="h-3 w-16 rounded mt-2" />
        </div>
    </div>
);

interface AIInsightsSectionProps {
    period: number;
}

export const AIInsightsSection: React.FC<AIInsightsSectionProps> = ({ period }) => {
    const { data: insights, loading, error } = useAIInsights(period);

    if (loading || !insights) {
        return <AIInsightsSkeleton />;
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm h-full flex items-center justify-center text-center">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Failed to load AI Insights: {error}</p>
            </div>
        );
    }

    return <AIInsights data={insights} />;
};

export default AIInsightsSection;
