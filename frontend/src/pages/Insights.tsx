import React from "react";

const Insights: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Insights</h1>
        <p className="text-gray-500">
          Analytics overview of customer reviews & performance
        </p>
      </div>

      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">

        <Card title="Active Sources" value="3" />

        <Card
          title="Total Reviews"
          value="1,247"
          sub="+12%"
          subColor="text-green-600"
        />

        <Card
          title="Negative Reviews"
          value="89"
          sub="-3%"
          subColor="text-red-600"
        />

      </div>

      {/* MIDDLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* SENTIMENT */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold text-lg mb-4">
            Sentiment Breakdown
          </h2>

          <Progress label="Positive" value={68} />
          <Progress label="Neutral" value={20} />
          <Progress label="Negative" value={12} />
        </div>

        {/* TRENDS */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="font-semibold text-lg mb-4">
            Review Trends
          </h2>

          <div className="h-40 flex items-center justify-center text-gray-400">
            📈 Chart goes here
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Review count increased steadily over the last 6 months.
          </p>
        </div>

      </div>

      {/* CATEGORY */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="font-semibold text-lg mb-4">
          Category Performance
        </h2>

        <Progress label="Staff" value={85} />
        <Progress label="Cleanliness" value={78} />
        <Progress label="Location" value={92} />
      </div>

    </div>
  );
};

/* CARD */
const Card = ({
  title,
  value,
  sub,
  subColor = "text-gray-400",
}: any) => (
  <div className="bg-white p-5 rounded-xl shadow">
    <p className="text-gray-500">{title}</p>
    <h2 className="text-3xl font-bold mt-2">{value}</h2>
    {sub && (
      <span className={`text-sm ${subColor}`}>
        {sub}
      </span>
    )}
  </div>
);

/* PROGRESS */
const Progress = ({ label, value }: any) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-1">
      <span>{label}</span>
      <span>{value}%</span>
    </div>

    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-blue-600 h-2 rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default Insights;
