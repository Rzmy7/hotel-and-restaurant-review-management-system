import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetupLayout from '../components/SetupLayout';

interface ReviewSource {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

const AddSourcesPage = () => {
  const navigate = useNavigate();
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [sources, setSources] = useState<ReviewSource[]>([
    { id: '1', name: 'Google Reviews', icon: 'G', connected: false },
    { id: '2', name: 'Booking.com', icon: 'G', connected: false },
    { id: '3', name: 'Google Reviews', icon: 'G', connected: true },
    { id: '4', name: 'Booking.com', icon: 'G', connected: false },
    { id: '5', name: 'Google Reviews', icon: 'G', connected: false },
    { id: '6', name: 'Trip Advisor', icon: 'G', connected: false },
  ]);

  const handleContinue = () => {
    navigate('/setup/schedule');
  };

  const handleBack = () => {
    navigate('/setup');
  };

  const handleConnect = (sourceId: string) => {
    setSources(sources.map(source =>
      source.id === sourceId ? { ...source, connected: !source.connected } : source
    ));
  };

  const handleConnectCustomSource = () => {
    if (customSourceUrl.trim()) {
      console.log('Connecting custom source:', customSourceUrl);
      alert('Custom source connection feature coming soon!');
    }
  };

  return (
    <SetupLayout
      currentStep={2}
      onContinue={handleContinue}
      onBack={handleBack}
    >
      <h1 className="text-[28px] font-semibold text-gray-800 text-center mb-10">
        Connect your Review Sources
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-8 max-md:grid-cols-1">
        {sources.map((source) => (
          <div
            key={source.id}
            className={`rounded-lg py-4 px-5 flex items-center justify-between transition-colors ${source.connected
                ? 'border-2 border-gray-300 bg-gray-50'
                : 'border-2 border-dashed border-gray-300 bg-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-500">
                {source.icon}
              </div>
              <div className="text-sm font-medium text-gray-800">{source.name}</div>
            </div>
            {source.connected ? (
              <button
                className="py-1.5 px-4 bg-gray-800 text-white border-none rounded-full text-[13px] font-medium flex items-center gap-1.5 cursor-pointer"
                onClick={() => handleConnect(source.id)}
              >
                Connected
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 6L9 17L4 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ) : (
              <button
                className="py-1.5 px-5 bg-gray-200 hover:bg-gray-300 text-gray-700 border-none rounded-md text-[13px] font-medium cursor-pointer transition-colors"
                onClick={() => handleConnect(source.id)}
              >
                Add
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="text-[15px] font-semibold text-gray-800 text-center mb-1.5">
          Don't you see your source ?
        </div>
        <div className="text-[13px] text-gray-500 text-center mb-5">
          Manually add a source by providing the URL to the review page
        </div>
        <div className="flex gap-3 items-center max-md:flex-col">
          <input
            type="text"
            placeholder="https://www.booking.com/hotel/us/westin-beach-resort-cosmo.html"
            value={customSourceUrl}
            onChange={(e) => setCustomSourceUrl(e.target.value)}
            className="flex-1 py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-[13px] text-gray-500 bg-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 max-md:w-full"
          />
          <button
            className="py-3 px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 border-none rounded-md text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors"
            onClick={handleConnectCustomSource}
          >
            Connect
          </button>
        </div>
      </div>
    </SetupLayout>
  );
};

export default AddSourcesPage;
