import React from "react";
import { Menu } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

/* ================= PROPS ================= */
type InsightsProps = {
  toggleSidebar: () => void;
};

/* ================= DATA ================= */

const positiveThemes = [
  { name: "Friendly and attentive staff", count: 487 },
  { name: "Excellent location near attractions", count: 423 },
  { name: "Clean and well-maintained rooms", count: 390 },
  { name: "Comfortable beds and linens", count: 356 },
  { name: "Great breakfast variety", count: 312 },
];

const negativeThemes = [
  { name: "Slow Wi-Fi connection", count: 178 },
  { name: "Long check-in wait times", count: 142 },
  { name: "Noise from street/neighbors", count: 120 },
  { name: "Small room size", count: 115 },
  { name: "Limited parking availability", count: 98 },
];

const sourceData = [
  { name: "Booking.com", value: 39, reviews: 485, rating: 4.5 },
  { name: "Google Maps", value: 30, reviews: 372, rating: 4.6 },
  { name: "TripAdvisor", value: 22, reviews: 268, rating: 4.2 },
  { name: "Agoda", value: 9, reviews: 115, rating: 4.3 },
];

const branchData = [
  { name: "Downtown", rating: "4.3/5", sentiment: "8.2/10", reviews: 645, score: 82 },
  { name: "Airport", rating: "4.1/5", sentiment: "7.8/10", reviews: 423, score: 78 },
  { name: "Marina", rating: "4.5/5", sentiment: "8.6/10", reviews: 372, score: 88 },
];

/* Radar chart data */
const competitorData = [
  { metric: "Rating", you: 85, compA: 80, compB: 82 },
  { metric: "Service", you: 88, compA: 83, compB: 85 },
  { metric: "Cleanliness", you: 90, compA: 82, compB: 86 },
  { metric: "Location", you: 87, compA: 81, compB: 84 },
  { metric: "Value", you: 83, compA: 78, compB: 80 },
];

const COLORS = ["#1e40af", "#2563eb", "#22c55e", "#ef4444"];

/* ================= PAGE ================= */

const Insights: React.FC<InsightsProps> = ({ toggleSidebar }) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={toggleSidebar}
          className="p-2 border rounded-md hover:bg-gray-100"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-gray-500">
            Analytics overview of customer reviews & performance
          </p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Kpi title="Active Sources" value="3" />
        <Kpi title="Total Reviews" value="1,247" sub="+12%" green />
        <Kpi title="Negative Reviews" value="89" sub="-3%" red />
      </div>

      {/* SENTIMENT + TREND */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h3 className="font-semibold mb-4">Sentiment Breakdown</h3>
          <Bar label="Positive" value={68} />
          <Bar label="Neutral" value={20} />
          <Bar label="Negative" value={12} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow flex flex-col justify-center items-center">
          📈 Chart goes here
          <p className="text-sm text-gray-400 mt-2">
            Review count increased steadily over last 6 months
          </p>
        </div>
      </div>

      {/* CATEGORY */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h3 className="font-semibold mb-4">Category Performance</h3>
        <Bar label="Staff" value={85} />
        <Bar label="Cleanliness" value={78} />
      </div>

      {/* THEMES */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <ThemeCard
          title="Top Positive Themes"
          subtitle="What guests love most"
          data={positiveThemes}
          color="bg-blue-600"
        />

        <ThemeCard
          title="Top Negative Themes"
          subtitle="Areas needing improvement"
          data={negativeThemes}
          color="bg-gray-800"
        />
      </div>

      {/* SOURCE PERFORMANCE */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h3 className="font-semibold mb-4">Source Performance</h3>

        <div className="grid md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={sourceData} dataKey="value" outerRadius={90}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            {sourceData.map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-gray-500">Avg rating {s.rating}/5</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-600 font-semibold">{s.reviews}</p>
                  <p className="text-gray-500">reviews</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BRANCH COMPARISON */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h3 className="font-semibold mb-4">Branch Comparison</h3>

        <div className="grid md:grid-cols-3 gap-6">
          {branchData.map((b, i) => (
            <div key={i} className="border p-4 rounded-lg">
              <h4 className="font-semibold">{b.name}</h4>
              <p>⭐ Rating {b.rating}</p>
              <p>😊 Sentiment {b.sentiment}</p>
              <p>💬 Reviews {b.reviews}</p>

              <div className="mt-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-blue-600 rounded"
                    style={{ width: `${b.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 COMPETITOR SNAPSHOT */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h3 className="font-semibold mb-1">Competitor Snapshot</h3>
        <p className="text-gray-500 text-sm mb-4">
          How you compare against competitors
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={competitorData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="metric" />
            <PolarRadiusAxis />
            <Radar name="Your Property" dataKey="you" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
            <Radar name="Competitor A" dataKey="compA" stroke="#111827" fill="#111827" fillOpacity={0.2} />
            <Radar name="Competitor B" dataKey="compB" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.2} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-3 text-center mt-4 text-sm">
          <div>
            <p className="text-gray-500">Your Avg Score</p>
            <p className="font-bold text-blue-600">87</p>
          </div>
          <div>
            <p className="text-gray-500">Competitor A</p>
            <p className="font-bold">81</p>
          </div>
          <div>
            <p className="text-gray-500">Competitor B</p>
            <p className="font-bold">82</p>
          </div>
        </div>
      </div>

    </div>
  );
};

/* ================= COMPONENTS ================= */

const Kpi = ({ title, value, sub, green, red }: any) => (
  <div className="bg-white p-6 rounded-xl shadow">
    <p className="text-gray-500">{title}</p>
    <h2 className="text-3xl font-bold">{value}</h2>
    {sub && (
      <p className={`text-sm ${green ? "text-green-600" : red ? "text-red-600" : ""}`}>
        {sub}
      </p>
    )}
  </div>
);

const Bar = ({ label, value }: any) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="h-2 bg-gray-200 rounded">
      <div className="h-2 bg-blue-600 rounded" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const ThemeCard = ({ title, subtitle, data, color }: any) => (
  <div className="bg-white p-6 rounded-xl shadow">
    <h3 className="font-semibold">{title}</h3>
    <p className="text-gray-500 text-sm mb-4">{subtitle}</p>

    {data.map((t: any, i: number) => (
      <div key={i} className="mb-3">
        <div className="flex justify-between text-sm">
          <span>{t.name}</span>
          <span>{t.count}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded">
          <div
            className={`h-2 rounded ${color}`}
            style={{ width: `${(t.count / 500) * 100}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

export default Insights;