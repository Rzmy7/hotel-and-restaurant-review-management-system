import React from 'react';
import { SentimentChartSection } from '../organisms/SentimentChartSection';
import { TrendsChartSection } from '../organisms/TrendsChartSection';
import { LatestReviewsSection } from '../organisms/LatestReviewsSection';
import { CategoryPerformanceSection } from '../organisms/CategoryPerformanceSection';
import { AIInsightsSection } from '../organisms/AIInsightsSection';
import { AlertsPanelSection } from '../organisms/AlertsPanelSection';
import { KPIsSection } from '../organisms/KPIsSection';
import { ReviewRatingDistributionSection } from '../organisms/ReviewRatingDistributionSection';
import { SourceComparisonSection } from '../organisms/SourceComparisonSection';
import { DashboardHeader } from '../organisms/DashboardHeader';
export interface DashboardTemplateProps {
    period: number;
    onPeriodChange: (period: number) => void;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({ period, onPeriodChange }) => {
    return (
        <>
            <DashboardHeader period={period} onPeriodChange={onPeriodChange} />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50 dark:bg-transparent">
                {/* Metrics Grid (Migrated to independent parallel hydration) */}
                <KPIsSection period={period} />

                {/* Charts Row (Migrated to independent parallel hydration) */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <SentimentChartSection period={period} />
                    <TrendsChartSection period={period} />
                </div>

                {/* Reviews and Category Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <LatestReviewsSection period={period} />
                    <CategoryPerformanceSection period={period} />
                </div>

                {/* AI Insights and Alerts Row */}
                <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
                    <AIInsightsSection period={period} />
                    <div>
                        <AlertsPanelSection />
                        <div className="mt-5">
                            <ReviewRatingDistributionSection period={period} />
                        </div>
                    </div>
                </div>

                {/* Source Comparison */}
                <SourceComparisonSection period={period} />
            </div>
        </>
    );
};

export default DashboardTemplate;
