// src/pages/DashboardPage.tsx
import React from 'react';
import DashboardHeader from '../components/DashboardHeader';
import MetricCard from '../components/MetricCard';
import SentimentChart from '../components/SentimentChart';
import TrendsChart from '../components/TrendsChart';
import LatestReviews from '../components/LatestReviews';
import CategoryPerformance from '../components/CategoryPerformance';
import AIInsights from '../components/AIInsights';
import AlertsPanel from '../components/AlertsPanel';
import SourceComparison from '../components/SourceComparison';
import { Star, Link2, MessageSquare, Frown, AlertCircle } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from '../contexts/ToastContext';
import DashboardSkeleton from '../components/DashboardSkeleton';

const DashboardPage: React.FC = () => {
  const { data, loading, error } = useDashboardData();
  const { showToast } = useToast();

  const handleSwitchOrganization = (orgId: string) => {
    showToast(`Switching to organization: ${orgId}`, 'info');
    // In a real app, this would refresh the dashboard data for the selected org
  };

  const handleAddOrganization = () => {
    showToast('Add organization feature coming soon', 'info');
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] bg-gray-50 p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">System Offline</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
          {error || "We're having trouble connecting to the analytics engine. Please check your connection or try again later."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        organizations={data.organizations}
        currentOrg={data.hotel}
        onSwitchOrganization={handleSwitchOrganization}
        onAddOrganization={handleAddOrganization}
      />

      <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6 bg-gray-50">
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
          <AlertsPanel alerts={data.alerts} />
        </div>

        {/* Source Comparison */}
        <SourceComparison sources={data.sourceComparison} />
      </div>
    </>
  );
};

export default DashboardPage;