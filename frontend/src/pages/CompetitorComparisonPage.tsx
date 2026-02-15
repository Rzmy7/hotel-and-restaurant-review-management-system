// src/pages/CompetitorComparisonPage.tsx
import React, { useState } from 'react';
import { Menu, Bell, ChevronDown, Lightbulb, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
import './CompetitorComparisonPage.css';

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

// Mock data structure - replace with API call later
const competitorsData = {
  'grand-plaza': {
    name: 'Grand Plaza Hotel',
    avgRating: 4.5,
    reviewCount: 2847,
    positivePercent: 78,
    negativePercent: 12,
    aspects: {
      cleanliness: 4.3,
      service: 4.6,
      location: 4.8,
      food: 4.2,
      comfort: 4.4,
    },
    trendData: [4.3, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7],
    sentimentDistribution: {
      positive: 45,
      neutral: 28,
      veryNegative: 8,
    }
  },
  'royal-beach': {
    name: 'Royal Beach Resort',
    avgRating: 4.3,
    reviewCount: 2723,
    positivePercent: 73,
    negativePercent: 15,
    aspects: {
      cleanliness: 4.7,
      service: 4.5,
      location: 4.6,
      food: 4.1,
      comfort: 4.3,
    },
    trendData: [3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5],
    sentimentDistribution: {
      positive: 50,
      neutral: 25,
      veryNegative: 10,
    }
  },
  'luxury-grand': {
    name: 'Luxury Grand Resort',
    avgRating: 4.7,
    reviewCount: 2847,
    positivePercent: 89,
    negativePercent: 5,
    aspects: {
      cleanliness: 4.8,
      service: 4.9,
      location: 4.5,
      food: 4.6,
      comfort: 4.7,
    },
    trendData: [4.5, 4.6, 4.6, 4.7, 4.7, 4.8, 4.7],
    sentimentDistribution: {
      positive: 55,
      neutral: 20,
      veryNegative: 5,
    }
  }
};

const CompetitorComparisonPage: React.FC<CompetitorComparisonPageProps> = ({ toggleSidebar }) => {
  const [searchParams] = useSearchParams();
  const competitorId = searchParams.get('id') || 'royal-beach';
  
  const [yourHotel] = useState('grand-plaza');
  const [selectedCompetitor, setSelectedCompetitor] = useState(competitorId);

  const yourData = competitorsData[yourHotel as keyof typeof competitorsData];
  const competitorData = competitorsData[selectedCompetitor as keyof typeof competitorsData];

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
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Your Hotel',
        data: yourData.trendData,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
      },
      {
        label: 'Competitor',
        data: competitorData.trendData,
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
          competitorData.sentimentDistribution.positive,
          competitorData.sentimentDistribution.neutral,
          competitorData.sentimentDistribution.veryNegative,
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      },
      {
        label: 'Your Hotel',
        data: [
          yourData.sentimentDistribution.positive,
          yourData.sentimentDistribution.neutral,
          yourData.sentimentDistribution.veryNegative,
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
    <div className="page-content">
      {/* Header */}
      <header className="comparison-header">
        <div className="header-left">
          <button className="menu-btn" onClick={toggleSidebar}>
            <Menu size={24} />
          </button>
          <div className="header-text">
            <h1>Competitor Comparison</h1>
            <p className="subtitle">Performance comparison overview</p>
          </div>
        </div>
        <div className="header-right">
          <div className="hotel-selector">
            <select value={yourHotel} className="hotel-dropdown">
              <option value="grand-plaza">Grand Plaza Hotel</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
          <div className="hotel-selector">
            <select 
              value={selectedCompetitor} 
              onChange={(e) => setSelectedCompetitor(e.target.value)}
              className="hotel-dropdown"
            >
              <option value="royal-beach">Royal Beach Resort</option>
              <option value="luxury-grand">Luxury Grand Resort</option>
            </select>
            <ChevronDown size={16} className="dropdown-icon" />
          </div>
          <button className="notification-btn">
            <Bell size={18} />
          </button>
          <div className="user-avatar">JD</div>
        </div>
      </header>

      {/* Content */}
      <div className="content-area">
        {/* Metrics Grid */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Average Rating</div>
            <div className="metric-value">{yourData.avgRating}</div>
            <div className={`metric-change ${parseFloat(avgRatingChange) > 0 ? 'positive' : 'negative'}`}>
              {parseFloat(avgRatingChange) > 0 ? '+' : ''}{avgRatingChange}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Review Count</div>
            <div className="metric-value">{yourData.reviewCount.toLocaleString()}</div>
            <div className={`metric-change ${reviewCountChange > 0 ? 'positive' : 'negative'}`}>
              {reviewCountChange > 0 ? '+' : ''}{reviewCountChange}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Positive %</div>
            <div className="metric-value">{yourData.positivePercent}%</div>
            <div className={`metric-change ${positiveChange > 0 ? 'positive' : 'negative'}`}>
              {positiveChange > 0 ? '+' : ''}{positiveChange}%
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Negative %</div>
            <div className="metric-value">{yourData.negativePercent}%</div>
            <div className={`metric-change ${negativeChange < 0 ? 'negative' : 'positive'}`}>
              {negativeChange > 0 ? '+' : ''}{negativeChange}%
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Aspect Comparison */}
          <div className="chart-card">
            <h3 className="chart-title">Aspect Comparison</h3>
            <div className="chart-container" style={{ height: '300px' }}>
              <Radar data={radarData} options={radarOptions} />
            </div>
          </div>

          {/* Rating Trend */}
          <div className="chart-card">
            <h3 className="chart-title">Rating Trend</h3>
            <div className="chart-container" style={{ height: '300px' }}>
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>

          {/* Sentiment Distribution */}
          <div className="chart-card">
            <h3 className="chart-title">Sentiment Distribution</h3>
            <div className="chart-container" style={{ height: '300px' }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="insights-card">
          <div className="insights-header">
            <Lightbulb size={20} className="insights-icon" />
            <h3>AI-Generated Insights</h3>
          </div>
          <div className="insights-tags">
            <div className="insight-tag success">
              <CheckCircle size={16} />
              Service Excellence
            </div>
            <div className="insight-tag success">
              <CheckCircle size={16} />
              Guest Comfort
            </div>
            <div className="insight-tag warning">
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
