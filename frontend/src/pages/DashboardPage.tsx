// src/pages/DashboardPage.tsx
import DashboardHeader from '../components/DashboardHeader.tsx';
import MetricCard from '../components/MetricCard.tsx';
import SentimentChart from '../components/SentimentChart.tsx';
import TrendsChart from '../components/TrendsChart.tsx';
import LatestReviews from '../components/LatestReviews.tsx';
import CategoryPerformance from '../components/CategoryPerformance.tsx';
import AIInsights from '../components/AIInsights.tsx';
import AlertsPanel from '../components/AlertsPanel.tsx';
import SourceComparison from '../components/SourceComparison.tsx';
import { Star, Link2, MessageSquare, Frown } from 'lucide-react';

interface DashboardPageProps {
  toggleSidebar?: () => void; // deprecated, no longer used
}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  return (
    <>
      {/* Header */}
      <DashboardHeader />

      <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50">
        {/* <ScrapeLauncher /> */}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 min-[1200px]:grid-cols-4 gap-4">
          <MetricCard
            icon={<Star size={20} />}
            label="Average Rating"
            value="4.3"
            change="+0.2"
            changeType="up"
            colorScheme="amber"
          />
          <MetricCard
            icon={<Link2 size={20} />}
            label="Active Sources"
            value="3"
            colorScheme="blue"
          />
          <MetricCard
            icon={<MessageSquare size={20} />}
            label="Total Reviews"
            value="1,247"
            change="+12%"
            changeType="up"
            colorScheme="indigo"
          />
          <MetricCard
            icon={<Frown size={20} />}
            label="Negative Reviews"
            value="89"
            change="-3%"
            changeType="down"
            colorScheme="rose"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
          <SentimentChart />
          <TrendsChart />
        </div>

        {/* Reviews and Category Row */}
        <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
          <LatestReviews />
          <CategoryPerformance />
        </div>

        {/* AI Insights and Alerts Row */}
        <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-5">
          <AIInsights />
          <AlertsPanel />
        </div>

        {/* Source Comparison */}
        <SourceComparison />
      </div>
    </>
  );
};

export default DashboardPage;