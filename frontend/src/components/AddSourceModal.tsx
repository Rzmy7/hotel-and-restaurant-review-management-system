import { useState } from 'react';
import { X, Globe, Link, Key, Calendar, ShieldCheck, Zap, RefreshCw } from 'lucide-react';
import type { SourcePlatform } from '../types/sources';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: any) => void;
}

const AddSourceModal = ({ isOpen, onClose, onSave }: AddSourceModalProps) => {
  const [platform, setPlatform] = useState<SourcePlatform>('TripAdvisor');
  const [propertyUrl, setPropertyUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [schedule, setSchedule] = useState<'Hourly' | 'Daily' | 'Weekly'>('Daily');
  const [sourceStatus, setSourceStatus] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!propertyUrl) return;

    const newSource = {
      platform,
      propertyUrl,
      syncSchedule: schedule,
      status: sourceStatus ? 'Active' : 'Paused',
    };
    onSave(newSource);
    onClose();
    // Reset form
    setPropertyUrl('');
    setApiKey('');
    setSchedule('Daily');
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTimeout(() => setIsTesting(false), 2000);
  };

  const platforms: SourcePlatform[] = ['TripAdvisor', 'Booking.com', 'Google Reviews', 'Airbnb'];

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-[550px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-none">Connect Source</h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">Add a new review channel to your dashboard</p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-xl transition-all shadow-sm" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-6">
          {/* Platform Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              Source Platform
            </label>
            <div className="grid grid-cols-2 gap-3">
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between ${platform === p
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700'
                    : 'border-gray-100 bg-gray-50/30 text-gray-500 hover:border-gray-200'
                    }`}
                >
                  {p}
                  {platform === p && <ShieldCheck size={16} />}
                </button>
              ))}
            </div>
          </div>

          {/* Property URL */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Link size={16} className="text-blue-500" />
              Property / Listing URL
            </label>
            <input
              type="text"
              className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
              placeholder="https://..."
              value={propertyUrl}
              onChange={(e) => setPropertyUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Schedule */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                Sync Schedule
              </label>
              <select
                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-500/20 transition-all outline-none appearance-none"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as any)}
              >
                <option value="Hourly">Every Hour</option>
                <option value="Daily">Once Daily</option>
                <option value="Weekly">Once Weekly</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Key size={16} className="text-blue-500" />
                API Key (Optional)
              </label>
              <input
                type="password"
                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500/20 transition-all outline-none"
                placeholder="••••••••"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </div>

          {/* Toggle & Test */}
          <div className="pt-4 flex items-center justify-between border-t border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={handleTestConnection}
                disabled={!propertyUrl || isTesting}
                className={`text-sm font-bold flex items-center gap-2 transition-all ${isTesting ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {isTesting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700">Auto-Sync</span>
              <label className="relative inline-flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={sourceStatus}
                  onChange={(e) => setSourceStatus(e.target.checked)}
                />
                <div className="w-12 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 bg-white hover:bg-gray-100 transition-all"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:shadow-none"
            onClick={handleSubmit}
            disabled={!propertyUrl}
          >
            Connect Platform
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSourceModal;
