import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Globe, Link, Key, Calendar, ShieldCheck, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Source } from '../../types/sources';
import { sourcesService } from '../../services/sourcesService';

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: any) => void;
}

const AddSourceModal = ({ isOpen, onClose, onSave }: AddSourceModalProps) => {
  const { data: platforms = [], isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: () => sourcesService.getPlatforms(),
    enabled: isOpen
  });

  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const [propertyUrl, setPropertyUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [schedule, setSchedule] = useState<'Hourly' | 'Daily' | 'Weekly'>('Daily');
  const [sourceStatus, setSourceStatus] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Set default platform once loaded
  useEffect(() => {
    if (isOpen && platforms.length > 0 && !selectedPlatformId) {
      setSelectedPlatformId(platforms[0].platform_id);
    }
  }, [isOpen, platforms, selectedPlatformId]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!propertyUrl || !selectedPlatformId) return;

    onSave({
      platformId: selectedPlatformId,
      propertyUrl,
      syncSchedule: schedule,
      status: sourceStatus ? 'Active' : 'Paused',
    });
    onClose();
    // Reset form
    setPropertyUrl('');
    setApiKey('');
    setSchedule('Daily');
  };

  const testConnection = () => {
    setIsTesting(true);
    setTimeout(() => setIsTesting(false), 2000);
  };

  const filteredPlatforms = platforms.filter((p: any) =>
    p.platform_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button
        variant="ghost"
        onClick={onClose}
        className="text-[11px] uppercase tracking-widest px-6"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        disabled={!propertyUrl}
        className="px-8 text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
      >
        Add Source
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Connect Source"
      description="Add a new review channel to your dashboard"
      footer={footer}
      className="max-w-[550px]"
    >
      <div className="p-8 space-y-6">
        {/* Platform Picker */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <Globe size={16} className="text-blue-500" />
              Source Platform
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search platforms..."
                className="pl-8 pr-4 py-2 bg-gray-100 dark:bg-slate-700 border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 transition-all outline-none w-48"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Globe size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            </div>
          </div>

          <div className="max-h-[160px] overflow-y-auto pr-2 grid grid-cols-2 gap-3 custom-scrollbar">
            {isLoadingPlatforms ? (
              <div className="col-span-2 py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">Loading Platforms...</p>
              </div>
            ) : filteredPlatforms.length > 0 ? (
              filteredPlatforms.map((p: any) => (
                <button
                  key={p.platform_id}
                  onClick={() => setSelectedPlatformId(p.platform_id)}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between ${selectedPlatformId === p.platform_id
                    ? 'border-blue-600 bg-blue-50/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'border-gray-100 bg-gray-50/30 text-gray-500 hover:border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600'
                    }`}
                >
                  {p.platform_name}
                  {selectedPlatformId === p.platform_id && <ShieldCheck size={16} />}
                </button>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">No platforms found</p>
              </div>
            )}
          </div>
        </div>

        {/* Property URL */}
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <Link size={16} className="text-blue-500" />
            Property / Listing URL
          </label>
          <input
            type="text"
            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-700 border-2 border-transparent rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
            placeholder="https://..."
            value={propertyUrl}
            onChange={(e) => setPropertyUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Schedule */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              Sync Schedule
            </label>
            <select
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-700 border-2 border-transparent rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500/20 transition-all outline-none appearance-none"
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
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Key size={16} className="text-blue-500" />
              API Key (Optional)
            </label>
            <input
              type="password"
              className="w-full px-5 py-3.5 bg-gray-50 dark:bg-slate-700 border-2 border-transparent rounded-2xl text-sm font-medium text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:border-blue-500/20 transition-all outline-none"
              placeholder="••••••••"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>

        {/* Toggle & Test */}
        <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-slate-700">
          <div className="flex">
            <Button
              variant={isTesting ? "outline" : "outline"} // Keeping outline but custom styles
              type="button"
              onClick={testConnection}
              disabled={isTesting || !propertyUrl}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 shadow-sm border ${isTesting
                ? 'bg-gray-50 text-gray-400 border-gray-100 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                : 'bg-white text-gray-700 border-gray-200 hover:border-[#4e80ee] hover:text-[#4e80ee] hover:shadow-blue-50 dark:bg-slate-700 dark:text-gray-200 dark:border-slate-600'
                }`}
            >
              <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
              {isTesting ? 'Checking Link...' : 'Test Connection'}
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Auto-Sync</span>
            <label className="relative inline-flex items-center cursor-pointer group">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={sourceStatus}
                onChange={(e) => setSourceStatus(e.target.checked)}
              />
              <div className="w-12 h-7 bg-gray-200 dark:bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 dark:after:border-slate-500 after:border after:rounded-full after:h-[19px] after:w-[19px] after:transition-all peer-checked:bg-blue-600 transition-colors"></div>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AddSourceModal;
