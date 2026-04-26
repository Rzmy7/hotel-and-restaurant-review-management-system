// src/types/dashboard.ts

export interface MetricTrend {
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  colorScheme: "blue" | "amber" | "indigo" | "rose" | "emerald";
}

export interface ChartDataPoint {
  label: string;
  volume: number;
  sentiment: number;
}

export interface Review {
  id: string;
  reviewerName: string;
  heading: string;
  source: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  time: string;
  rating: number;
  date: string;
  reviewText: string;
  categories: string[];
}

export interface AIInsightItem {
  label: string;
  impact: "High" | "Med" | "Low" | "Critical";
  freq: string;
}

export interface AIInsightsData {
  strengths: AIInsightItem[];
  issues: AIInsightItem[];
  highlight: {
    text: string;
    correlation: string;
  };
}

export interface Alert {
  id: number;
  message: string;
  type: "critical" | "warning" | "info";
  time: string;
}

export interface SourceSentiment {
  pos: number;
  neu: number;
  neg: number;
}

export interface SourceData {
  name: string;
  rating: number;
  trend: string;
  trendType: "up" | "down" | "neutral";
  reviews: number;
  pct: number;
  color: string;
  bgColor: string;
  borderColor: string;
  sentiment: SourceSentiment;
  lastSync: string;
  isOthers?: boolean;
}

export interface SentimentDistribution {
  positive: { count: number; percentage: number };
  neutral: { count: number; percentage: number };
  negative: { count: number; percentage: number };
}

export interface RatingDistributionItem {
  rating: number;
  count: number;
  percentage: number;
}

export interface Organization {
  id: string;
  name: string;
  status: string;
}

export interface CategoryPerformanceItem {
  name: string;
  score: number;
  count: number;
  icon: string;
  trend: string;
  trendType: "up" | "down" | "neutral";
}

export interface DashboardResponse {
  hotel: Organization;
  organizations: Organization[];
  currentOrganizationId: string;
  metrics: {
    avgRating: MetricTrend;
    activeSources: MetricTrend;
    totalReviews: MetricTrend;
    negativeReviews: MetricTrend;
    ratingDistribution: RatingDistributionItem[];
  };
  charts: {
    sentiment: SentimentDistribution;
    reviewsOverTime: ChartDataPoint[];
    sentimentTrends: ChartDataPoint[];
  };
  latestReviews: Review[];
  aiInsights: AIInsightsData;
  alerts: Alert[];
  sourceComparison: SourceData[];
  categoryPerformance: CategoryPerformanceItem[];
}
