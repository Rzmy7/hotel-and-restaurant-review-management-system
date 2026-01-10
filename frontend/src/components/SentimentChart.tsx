

const SentimentChart = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="mb-5">
        <h3 className="m-0 text-base font-bold text-gray-800">Sentiment Distribution</h3>
      </div>

      <div className="flex gap-6 items-center max-md:flex-col">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="30"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="30"
              strokeDasharray="340 163"
              strokeDashoffset="25"
              transform="rotate(-90 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="30"
              strokeDasharray="100 403"
              strokeDashoffset="-315"
              transform="rotate(-90 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#4b5563"
              strokeWidth="30"
              strokeDasharray="60 443"
              strokeDashoffset="-415"
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="m-0 text-3xl font-extrabold text-gray-800">68%</p>
            <p className="mt-1 text-sm text-gray-500">Positive</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 flex-1 w-full">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="flex-1 text-sm text-gray-800 font-medium">Positive</span>
            <span className="text-sm text-gray-500 font-semibold">68%</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-slate-300"></span>
            <span className="flex-1 text-sm text-gray-800 font-medium">Neutral</span>
            <span className="text-sm text-gray-500 font-semibold">20%</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-gray-600"></span>
            <span className="flex-1 text-sm text-gray-800 font-medium">Negative</span>
            <span className="text-sm text-gray-500 font-semibold">12%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;
