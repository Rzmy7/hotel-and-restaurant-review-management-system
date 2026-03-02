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
import { Star as StarIcon } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from '../contexts/ToastContext';
import DashboardSkeleton from '../components/DashboardSkeleton';

const DashboardPage: React.FC = () => {
  const { data, loading, error } = useDashboardData();
  useToast();

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
      <DashboardHeader />

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
          <div>
            <AlertsPanel alerts={data.alerts} />
            {/* Review Rating Distribution directly below alerts */}
            <div className="bg-white border border-gray-100 rounded-xl p-6 mt-4">
              <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest mb-2">Review Rating Distribution</h3>
              <div className="flex flex-col gap-3">
                {(() => {
                  const total = data.latestReviews.length;
                  return [5, 4, 3, 2, 1].map(star => {
                    const count = data.latestReviews.filter(r => r.rating === star).length;
                    const pct = total ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 w-full">
                        <span className="flex items-center min-w-[90px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <StarIcon
                              key={i}
                              size={18}
                              className={i < star ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-100'}
                              style={{ marginRight: 2 }}
                            />
                          ))}
                        </span>
                        <span className="text-xs text-gray-700 font-bold min-w-[60px]">{count} review{count !== 1 ? 's' : ''}</span>
                        <span className="text-xs text-gray-400 font-bold min-w-[32px]">{pct}%</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: '#3D4656' }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Source Comparison */}
        <SourceComparison sources={data.sourceComparison} />
      </div>
    </>
  );
};

export default DashboardPage;
