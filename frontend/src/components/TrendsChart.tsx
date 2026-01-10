

const TrendsChart = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="m-0 text-base font-bold text-gray-800">Review Trends</h3>
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span>Review Count</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Sentiment Score</span>
          </div>
        </div>
      </div>

      <div className="my-5 mb-3 h-[140px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-lg">
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full">
          {/* Background grid lines */}
          <line x1="0" y1="50" x2="600" y2="50" stroke="#f3f4f6" strokeWidth="1" />
          <line x1="0" y1="100" x2="600" y2="100" stroke="#f3f4f6" strokeWidth="1" />
          <line x1="0" y1="150" x2="600" y2="150" stroke="#f3f4f6" strokeWidth="1" />

          {/* Review Count Line (dotted gray) */}
          <polyline
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
            strokeDasharray="4,4"
            points="0,120 100,115 200,125 300,118 400,122 500,120 600,118"
          />

          {/* Sentiment Score Line (solid blue) */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            points="0,140 100,135 200,125 300,115 400,105 500,95 600,85"
          />
        </svg>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-gray-400 mt-2">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
      </div>
    </div>
  );
};

export default TrendsChart;
