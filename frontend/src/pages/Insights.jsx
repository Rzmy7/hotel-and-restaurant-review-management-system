import React from "react";

const Insights = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Insights</h1>

      <p className="text-gray-600 mb-6">
        This page provides detailed analytics based on customer reviews and
        sentiment trends.
      </p>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <h3>Total Reviews</h3>
          <p className="value">1,247</p>
          <span className="positive">+12% from last month</span>
        </div>

        <div className="card">
          <h3>Negative Reviews</h3>
          <p className="value">89</p>
          <span className="negative">-3% improvement</span>
        </div>

        <div className="card">
          <h3>Active Sources</h3>
          <p className="value">3</p>
        </div>
      </div>

      {/* SENTIMENT */}
      <div className="card mb-6">
        <h2>Sentiment Analysis</h2>
        <ul>
          <li>Positive: 68%</li>
          <li>Neutral: 20%</li>
          <li>Negative: 12%</li>
        </ul>
      </div>

      {/* CATEGORY PERFORMANCE */}
      <div className="card mb-6">
        <h2>Category Performance</h2>
        <p>Staff – 85%</p>
        <p>Cleanliness – 78%</p>
        <p>Location – 92%</p>
      </div>

      {/* TREND EXPLANATION */}
      <div className="card">
        <h2>Review Trends</h2>
        <p>
          Reviews have gradually increased over the past 6 months.  
          Sentiment score shows steady improvement, indicating better customer
          satisfaction.
        </p>
      </div>
    </div>
  );
};

export default Insights;
