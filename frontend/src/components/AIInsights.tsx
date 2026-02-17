const AIInsights = () => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">AI Insights</h3>
        <button className="text-blue-500 font-semibold text-sm hover:underline">View</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-bold text-gray-900">What Customers Liked</h4>
          <ul className="ml-5 list-disc text-emerald-600 text-sm leading-relaxed">
            <li>Exceptional staff service</li>
            <li>Prime beach location</li>
            <li>Clean, spacious rooms</li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h4 className="mb-3 text-sm font-bold text-gray-900">Common Complaints</h4>
          <ul className="ml-5 list-disc text-red-600 text-sm leading-relaxed">
            <li>Slow Wi-Fi connection</li>
            <li>Limited breakfast options</li>
            <li>Noisy air conditioning</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 px-3 py-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg text-blue-900 font-semibold text-sm text-center">
        Wi-Fi mentioned in 34% of negative reviews
      </div>
    </div>
  );
};

export default AIInsights;
