import { useToast } from '../contexts/ToastContext';

const AIInsights = () => {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex justify-between items-center mb-5">
        <h3 className="m-0 text-base font-bold text-gray-800">AI Insights</h3>
        <button
          className="bg-none border-none text-blue-500 font-semibold text-sm cursor-pointer hover:underline"
          onClick={() => showToast('Full AI Insights report coming soon', 'info')}
        >
          View
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mt-4">
        <div className="flex flex-col">
          <h4 className="m-0 mb-3 text-sm font-bold text-gray-800">What Customers Liked</h4>
          <ul className="m-0 pl-5 list-disc text-sm leading-relaxed text-emerald-600">
            <li>Exceptional staff service</li>
            <li>Prime beach location</li>
            <li>Clean, spacious rooms</li>
          </ul>
        </div>

        <div className="flex flex-col">
          <h4 className="m-0 mb-3 text-sm font-bold text-gray-800">Common Complaints</h4>
          <ul className="m-0 pl-5 list-disc text-sm leading-relaxed text-red-600">
            <li>Slow Wi-Fi connection</li>
            <li>Limited breakfast options</li>
            <li>Noisy air conditioning</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 p-3 bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg text-blue-800 font-semibold text-sm text-center">
        Wi-Fi mentioned in 34% of negative reviews
      </div>
    </div>
  );
};

export default AIInsights;
