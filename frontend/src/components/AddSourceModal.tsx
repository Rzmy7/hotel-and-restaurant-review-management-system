import { useState } from 'react';
import { X } from 'lucide-react';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddSourceModal = ({ isOpen, onClose }: AddSourceModalProps) => {
  const [platform, setPlatform] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [schedule, setSchedule] = useState('Daily');
  const [sourceStatus, setSourceStatus] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    console.log({ platform, propertyUrl, apiKey, schedule, sourceStatus });
    onClose();
  };

  const inputClasses =
    'w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white box-border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  const selectClasses =
    'w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white cursor-pointer outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-[500px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 m-0">Add Source</h2>
          <button className="bg-transparent border-none cursor-pointer p-1 text-gray-500 hover:text-gray-700 flex items-center rounded transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Platform Select */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Platform</label>
            <select className={selectClasses} value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="">Select a platform</option>
              <option value="booking">Booking.com</option>
              <option value="tripadvisor">TripAdvisor</option>
              <option value="google">Google Reviews</option>
              <option value="airbnb">Airbnb</option>
            </select>
          </div>

          {/* Property URL */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Property / Hotel URL</label>
            <input
              type="text"
              className={inputClasses}
              placeholder="https://example.com/hotel"
              value={propertyUrl}
              onChange={(e) => setPropertyUrl(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key (optional)</label>
            <input
              type="text"
              className={inputClasses}
              placeholder="Enter API key if available"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          {/* Schedule */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
            <select className={selectClasses} value={schedule} onChange={(e) => setSchedule(e.target.value)}>
              <option value="Hourly">Hourly</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
            </select>
          </div>

          {/* Test Connection */}
          <button className="py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-blue-500 bg-white hover:bg-blue-50 cursor-pointer transition-colors">
            Test Connection
          </button>

          {/* Source Status Toggle */}
          <div className="flex items-center justify-between mt-5">
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Source Status</div>
              <div className="text-[13px] text-gray-500">Enable to start collecting reviews immediately</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={sourceStatus}
                onChange={(e) => setSourceStatus(e.target.checked)}
              />
              <span className="w-11 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-[20px]"></span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            className="py-2.5 px-5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="py-2.5 px-5 border-none rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors"
            onClick={handleSubmit}
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSourceModal;
