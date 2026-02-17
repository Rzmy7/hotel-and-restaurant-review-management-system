// src/pages/CompetitorComparisonPage.tsx
import React, { useState, useEffect } from 'react';
import { Menu, Bell, ChevronDown, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API_BASE_URL from '../config/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Radar, Line, Bar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface CompetitorComparisonPageProps {
  toggleSidebar: () => void;
}

interface ComparisonData {
  myHotel: {
    name: string;
    avgRating: number;
    reviewCount: number;
    positivePercent: number;
    negativePercent: number;
    aspects: {
      cleanliness: number;
      service: number;
      location: number;
      food: number;
      comfort: number;
    };
  };
  competitor: {
    name: string;
    avgRating: number;
    reviewCount: number;
    positivePercent: number;
    negativePercent: number;
    aspects: {
      cleanliness: number;
      service: number;
      location: number;
      food: number;
      comfort: number;
    };
  };
}

interface ChartData {
  trendData: {
    labels: string[];
    myHotelData: number[];
    competitorData: number[];
  };
  sentimentData: {
    myHotelPositive: number;
    myHotelNeutral: number;
    myHotelVeryNegative: number;
    competitorPositive: number;
    competitorNeutral: number;
    competitorVeryNegative: number;
  };
}

const CompetitorComparisonPage: React.FC<CompetitorComparisonPageProps> = ({ toggleSidebar }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const competitorId = searchParams.get('id') || '2';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [availableCompetitors, setAvailableCompetitors] = useState<Array<{id: number, name: string}>>([]);

  // Fetch comparison data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch comparison data
        const comparisonResponse = await fetch(`${API_BASE_URL}/competitors/${competitorId}/compare`);
        if (!comparisonResponse.ok) {
          throw new Error('Failed to fetch comparison data');
        }
        const comparison = await comparisonResponse.json();
        setComparisonData(comparison);

        // Fetch chart data
        const chartResponse = await fetch(`${API_BASE_URL}/competitors/${competitorId}/chart-data`);
        if (!chartResponse.ok) {
          throw new Error('Failed to fetch chart data');
        }
        const charts = await chartResponse.json();
        setChartData(charts);

        // Fetch available competitors for dropdown
        const competitorsResponse = await fetch(`${API_BASE_URL}/competitors`);
        if (!competitorsResponse.ok) {
          throw new Error('Failed to fetch competitors');
        }
        const competitors = await competitorsResponse.json();
        setAvailableCompetitors(competitors.map((c: any) => ({ id: c.id, name: c.name })));

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error fetching comparison data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [competitorId]);

  // Show loading or error states
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading comparison data...</div>
      </div>
    );
  }

  if (error || !comparisonData || !chartData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">{error || 'No data available'}</div>
      </div>
    );
  }

const yourData = comparisonData.myHotel;
  const competitorData = comparisonData.competitor;

  // Radar Chart Data
  const radarData = {
    labels: ['Cleanliness', 'Service', 'Location', 'Food', 'Comfort'],
    datasets: [
      {
        label: 'Your Hotel',
        data: [
          yourData.aspects.cleanliness,
          yourData.aspects.service,
          yourData.aspects.location,
          yourData.aspects.food,
          yourData.aspects.comfort,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      },
      {
        label: 'Competitor',
        data: [
          competitorData.aspects.cleanliness,
          competitorData.aspects.service,
          competitorData.aspects.location,
          competitorData.aspects.food,
          competitorData.aspects.comfort,
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
      },
    ],
  };

  // Line Chart Data
  const lineData = {
    labels: chartData.trendData.labels,
    datasets: [
      {
        label: 'Your Hotel',
        data: chartData.trendData.myHotelData,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      },
      {
        label: 'Competitor',
        data: chartData.trendData.competitorData,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
      },
    ],
  };

  // Bar Chart Data
  const barData = {
    labels: ['Positive', 'Neutral', 'Very Negative'],
    datasets: [
      {
        label: 'Competitor',
        data: [
          chartData.sentimentData.competitorPositive,
          chartData.sentimentData.competitorNeutral,
          chartData.sentimentData.competitorVeryNegative,
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Your Hotel',
        data: [
          chartData.sentimentData.myHotelPositive,
          chartData.sentimentData.myHotelNeutral,
          chartData.sentimentData.myHotelVeryNegative,
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 5,
        ticks: {
          stepSize: 1,
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        min: 3.5,
        max: 5,
      },
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 60,
      },
    },
  };

  const avgRatingChange = ((yourData.avgRating - competitorData.avgRating) * 100 / competitorData.avgRating).toFixed(1);
  const reviewCountChange = yourData.reviewCount - competitorData.reviewCount;
  const positiveChange = yourData.positivePercent - competitorData.positivePercent;
  const negativeChange = yourData.negativePercent - competitorData.negativePercent;

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 py-5 bg-white border-b border-gray-200 gap-4">
        <div className="flex items-start gap-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div>
            <h1 className="m-0 text-2xl font-bold text-gray-800">Competitor Comparison</h1>
            <p className="mt-1 mb-0 text-xs text-gray-400">Performance comparison overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap w-full md:w-auto">
          <div className="relative">
            <select value="" disabled className="appearance-none px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm cursor-not-allowed hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">{comparisonData.myHotel.name}</option>
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
          <div className="relative">
            <select 
              value={competitorId} 
              onChange={(e) => navigate(`/competitors/compare?id=${e.target.value}`)}
              className="appearance-none px-4 py-2 pr-8 bg-white border border-gray-200 rounded-lg text-sm cursor-pointer hover:border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {availableCompetitors.map(comp => (
                <option key={comp.id} value={String(comp.id)}>{comp.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={18} />
          </button>
          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">JD</div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Average Rating</div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{yourData.avgRating}</div>
            <div className={`text-sm font-medium ${parseFloat(avgRatingChange) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(avgRatingChange) > 0 ? '+' : ''}{avgRatingChange}%
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Review Count</div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{yourData.reviewCount.toLocaleString()}</div>
            <div className={`text-sm font-medium ${reviewCountChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {reviewCountChange > 0 ? '+' : ''}{reviewCountChange}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Positive %</div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{yourData.positivePercent}%</div>
            <div className={`text-sm font-medium ${positiveChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {positiveChange > 0 ? '+' : ''}{positiveChange}%
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-xs text-gray-500 mb-3 font-medium">Negative %</div>
            <div className="text-3xl font-bold text-gray-800 mb-2">{yourData.negativePercent}%</div>
            <div className={`text-sm font-medium ${negativeChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {negativeChange > 0 ? '+' : ''}{negativeChange}%
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          {/* Aspect Comparison */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Aspect Comparison</h3>
            <div className="h-[300px]">
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>

          {/* Rating Trend */}
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Rating Trend</h3>
            <div className="h-[300px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm lg:col-span-2 xl:col-span-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sentiment Distribution</h3>
            <div className="h-[300px]">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800 m-0">AI-Generated Insights</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle size={16} />
              Service Excellence
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              <CheckCircle size={16} />
              Guest Comfort
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              <AlertTriangle size={16} />
              Location Perception
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorComparisonPage;
