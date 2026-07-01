import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from '../contexts/ToastContext';
import DashboardSkeleton from './DashboardSkeleton';
import { DashboardTemplate } from '../components/dashboard/templates/DashboardTemplate';

const DashboardPage: React.FC = () => {
  const [period, setPeriod] = useState<number>(0); // 0 = All Time (default)
  const { data, loading, error } = useDashboardData(period);
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

  return <DashboardTemplate data={data} period={period} onPeriodChange={setPeriod} />;
};

export default DashboardPage;
