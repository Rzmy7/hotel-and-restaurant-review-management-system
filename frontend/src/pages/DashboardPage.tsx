// src/pages/DashboardPage.tsx
import React from 'react';
import DashboardHeader from '../components/DashboardHeader.tsx';
import MetricCard from '../components/MetricCard.tsx';
import SentimentChart from '../components/SentimentChart.tsx';
import TrendsChart from '../components/TrendsChart.tsx';
import LatestReviews from '../components/LatestReviews.tsx';
import CategoryPerformance from '../components/CategoryPerformance.tsx';
import AIInsights from '../components/AIInsights.tsx';
import AlertsPanel from '../components/AlertsPanel.tsx';
import ReviewSources from '../components/ReviewSources.tsx';
import { Star, Link2, MessageSquare, Frown } from 'lucide-react';
import '../App.css';

interface DashboardPageProps {
  toggleSidebar: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ toggleSidebar }) => {
  return (
    <>
      {/* Header */}
      <DashboardHeader onMenuClick={toggleSidebar} />

      <div className="content-area">
        {/* <ScrapeLauncher /> */}

        {/* Metrics Grid */}
        <div className="metrics-grid">
          <MetricCard
            icon={<Star size={20} />}
            label="Average Rating"
            value="4.3"
            change="+0.2"
            changeType="up"
          />
          <MetricCard
            icon={<Link2 size={20} />}
            label="Active Sources"
            value="3"
          />
          <MetricCard
            icon={<MessageSquare size={20} />}
            label="Total Reviews"
            value="1,247"
            change="+12%"
            changeType="up"
          />
          <MetricCard
            icon={<Frown size={20} />}
            label="Negative Reviews"
            value="89"
            change="-3%"
            changeType="down"
          />
        </div>

        {/* Charts Row */}
        <div className="dashboard-grid">
          <SentimentChart />
          <TrendsChart />
        </div>

        {/* Reviews and Category Row */}
        <div className="dashboard-grid">
          <LatestReviews />
          <CategoryPerformance />
        </div>

        {/* AI Insights and Alerts Row */}
        <div className="dashboard-grid">
          <AIInsights />
          <AlertsPanel />
        </div>

        {/* Review Sources */}
        <div className="dashboard-grid">
          <ReviewSources />
        </div>
      </div>
    </>
  );
};

export default DashboardPage;