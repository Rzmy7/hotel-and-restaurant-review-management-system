import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Source {
  id: number;
  platform: string;
  status: 'Active' | 'Paused';
  lastSynced: string;
  schedule: string;
}

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onSave: (source: Source) => void;
}

const EditSourceModal = ({ isOpen, onClose, source, onSave }: EditSourceModalProps) => {
  const [platform, setPlatform] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('https://example.com/tripadvisor');
  const [apiKey, setApiKey] = useState('**********');
  const [schedule, setSchedule] = useState('Hourly');
  const [sourceStatus, setSourceStatus] = useState(false);

  useEffect(() => {
    if (source) {
      setPlatform(source.platform);
      setSchedule(source.schedule);
      setSourceStatus(source.status === 'Active');
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const handleSave = () => {
    if (source) {
      const updatedSource = {
        ...source,
        platform,
        schedule,
        status: sourceStatus ? 'Active' as const : 'Paused' as const,
      };
      onSave(updatedSource);
      onClose();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this source?')) {
      console.log('Deleting source:', source.id);
      onClose();
    }
  };

  const inputClasses =
    'w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white box-border outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
  const selectClasses =
    'w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white cursor-pointer outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-[800px] shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 m-0 mb-1">Edit Source</h2>
            <p className="text-sm text-gray-500 m-0">{source.platform}</p>
          </div>
          <button className="bg-transparent border-none cursor-pointer p-1 text-gray-500 hover:text-gray-700 flex items-center rounded transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-2 gap-8 overflow-y-auto flex-1 max-md:grid-cols-1">
          {/* Left Column - Form */}
          <div className="flex flex-col">
            {/* Platform Select */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Source Platform</label>
              <select className={selectClasses} value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="TripAdvisor">TripAdvisor</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Google Reviews">Google Reviews</option>
                <option value="Airbnb">Airbnb</option>
              </select>
            </div>

            {/* Property URL */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Property / Hotel URL</label>
              <input
                type="text"
                className={inputClasses}
                value={propertyUrl}
                onChange={(e) => setPropertyUrl(e.target.value)}
              />
            </div>

            {/* API Key */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
              <input
                type="password"
                className={inputClasses}
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

            {/* Source Status Toggle */}
            <div className="flex items-center justify-between mt-5">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Source Status</div>
                <div className="text-[13px] text-gray-500">
                  {sourceStatus ? 'Active and collecting reviews' : 'Paused'}
                </div>
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

            {/* Delete Button */}
            <button
              className="mt-6 py-2.5 px-5 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-white hover:bg-red-50 cursor-pointer transition-colors self-start"
              onClick={handleDelete}
            >
              Delete Source
            </button>
          </div>

          {/* Right Column - Statistics */}
          <div className="flex flex-col">
            <div className="bg-gray-50 p-5 rounded-lg">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Source Statistics</h3>

              <div className="mb-4">
                <div className="text-[13px] text-gray-500 mb-1">Last Run Time</div>
                <div className="text-sm font-medium text-gray-900">{source.lastSynced}</div>
              </div>

              <div className="mb-4">
                <div className="text-[13px] text-gray-500 mb-1">Next Run Time</div>
                <div className="text-sm font-medium text-gray-900">In 45 minutes</div>
              </div>

              <div className="mb-4">
                <div className="text-[13px] text-gray-500 mb-1">Success Rate</div>
                <div className="text-sm font-medium text-emerald-500">96%</div>
                <div className="w-full h-2 bg-gray-200 rounded mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded transition-all" style={{ width: '96%' }} />
                </div>
              </div>

              <div className="mb-4">
                <div className="text-[13px] text-gray-500 mb-1">Error Count</div>
                <div className="text-sm font-medium text-gray-900">0 errors</div>
              </div>

              <div>
                <div className="text-[13px] text-gray-500 mb-1">Source ID</div>
                <div className="text-sm font-medium text-gray-900 font-mono">60800081</div>
              </div>
            </div>
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
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSourceModal;
