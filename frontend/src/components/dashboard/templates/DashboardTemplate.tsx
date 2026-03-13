import React from 'react';
import { DashboardHeader } from '../organisms/DashboardHeader';
import { MetricCard } from '../molecules/MetricCard';
import { SentimentChart } from '../organisms/SentimentChart';
import { TrendsChart } from '../organisms/TrendsChart';
import { LatestReviews } from '../organisms/LatestReviews';
import { CategoryPerformance } from '../organisms/CategoryPerformance';
import { AIInsights } from '../organisms/AIInsights';
import { AlertsPanel } from '../organisms/AlertsPanel';
import ReviewRatingDistribution from '../../reviews/ReviewRatingDistribution';
import SourceComparison from '../../shared/SourceComparison';
import { Star, Link2, MessageSquare, Frown } from 'lucide-react';
import type { DashboardResponse } from '../../../types/dashboard';

export interface DashboardTemplateProps {
    data: DashboardResponse;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({ data }) => {
    return (
        <>
            <DashboardHeader />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50 dark:bg-transparent">
                {/* Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
                    <MetricCard
                        icon={<Star size={20} />}
                        label="Average Rating"
                        {...data.metrics.avgRating}
                    />
                    <MetricCard
                        icon={<Link2 size={20} />}
                        label="Active Sources"
                        {...data.metrics.activeSources}
                    />
                    <MetricCard
                        icon={<MessageSquare size={20} />}
                        label="Total Reviews"
                        {...data.metrics.totalReviews}
                    />
                    <MetricCard
                        icon={<Frown size={20} />}
                        label="Negative Reviews"
                        {...data.metrics.negativeReviews}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <SentimentChart data={data.charts.sentiment} />
                    <TrendsChart data={data.charts.reviewsOverTime} />
                </div>

                {/* Reviews and Category Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <LatestReviews reviews={data.latestReviews} />
                    <CategoryPerformance />
                </div>

                {/* AI Insights and Alerts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <AIInsights data={data.aiInsights} />
                    <div>
                        <AlertsPanel alerts={data.alerts} />
                        <div className="mt-5">
                            <ReviewRatingDistribution distribution={data.metrics.ratingDistribution} />
                        </div>
                    </div>
                </div>

                {/* Source Comparison */}
                <SourceComparison sources={data.sourceComparison} />
            </div>
        </>
    );
};

export default DashboardTemplate;
