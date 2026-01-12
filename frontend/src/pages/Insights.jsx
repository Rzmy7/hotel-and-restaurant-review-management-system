import React from "react";

const Insights = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* PAGE TITLE */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-gray-600">
          Detailed analytics and performance insights based on customer reviews.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">Total Reviews</h3>
          <p className="text-3xl font-bold">1,247</p>
          <span className="text-green-600 text-sm">
            +12% from last month
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">Negative Reviews</h3>
          <p className="text-3xl font-bold">89</p>
          <span className="text-red-600 text-sm">
            -3% improvement
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl shadow">
          <h3 className="text-gray-500">Active Sources</h3>
          <p className="text-3xl font-bold">3</p>
          <span className="text-gray-400 text-sm">
            Google, Booking, TripAdvisor
          </span>
        </div>

      </div>

      {/* SENTIMENT SECTION */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Sentiment Analysis
        </h2>

        <div className="space-y-2">
          <p>😊 Positive : <b>68%</b></p>
          <p>😐 Neutral : <b>20%</b></p>
          <p>😞 Negative : <b>12%</b></p>
        </div>

        <p className="text-gray-600 mt-3">
          Majority of customers express positive feedback, showing good
          satisfaction levels.
        </p>
      </div>

      {/* CATEGORY PERFORMANCE */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Category Performance
        </h2>

        <div className="space-y-3">
          <div>
            <p>Staff – 85%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-[85%]"></div>
            </div>
          </div>

          <div>
            <p>Cleanliness – 78%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-[78%]"></div>
            </div>
          </div>

          <div>
            <p>Location – 92%</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full w-[92%]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* TREND ANALYSIS */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">
          Review Trends
        </h2>

        <p className="text-gray-700 leading-relaxed">
          Review count has gradually increased over the last 6 months.
          Sentiment score shows a steady upward trend, indicating
          improvements in service quality and customer satisfaction.
        </p>

        <ul className="list-disc ml-6 mt-3 text-gray-600">
          <li>March recorded the highest growth</li>
          <li>Negative reviews reduced after service changes</li>
          <li>Repeat customers increased</li>
        </ul>
      </div>

    </div>
  );
};

export default Insights;
