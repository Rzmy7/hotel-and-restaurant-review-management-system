import { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Globe
} from 'lucide-react';
import type { Source, SourceStatus, SyncSchedule } from '../types/sources';

// Brand Logos
import BookingLogo from '../assets/source-logo/Booking.jpeg';
import AgodaLogo from '../assets/source-logo/agoda.jpeg';
import AirbnbLogo from '../assets/source-logo/airbnb.jpeg';
import TripAdvisorLogo from '../assets/source-logo/tripAdvisor.jpeg';

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onSave: (source: Source) => void;
  onDelete: (sourceId: number) => void;
  initialTab?: 'settings' | 'analytics';
}

const EditSourceModal = ({ isOpen, onClose, source, onSave, onDelete, initialTab = 'settings' }: EditSourceModalProps) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'analytics'>(initialTab);
  const [syncSchedule, setSyncSchedule] = useState<SyncSchedule>('Daily');
  const [status, setStatus] = useState<SourceStatus>('Active');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (source) {
      setSyncSchedule(source.syncSchedule);
      setStatus(source.status === 'Error' ? 'Active' : source.status);
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const getLogo = () => {
    switch (source.platform) {
      case 'TripAdvisor': return TripAdvisorLogo;
      case 'Booking.com': return BookingLogo;
      case 'Agoda': return AgodaLogo;
      case 'Airbnb': return AirbnbLogo;
      default: return null;
    }
  };

  const logo = getLogo();

  const handleSave = () => {
    onSave({
      ...source,
      syncSchedule,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 min-w-[320px]">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100">
        {/* Header - Aligned with Dashboard branding */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg bg-blue-50 text-[#4e80ee] border border-blue-100/50 shadow-sm uppercase tracking-tighter overflow-hidden bg-white`}>
              {logo ? (
                <img src={logo} alt={source.platform} className="w-full h-full object-cover" />
              ) : (
                source.platform[0]
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Source Configuration</h2>
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 border border-gray-200`}>
                  ID: #{source.id}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{source.platform} Source</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation - Sophisticated branding */}
        <div className="px-8 bg-gray-50/30 border-b border-gray-100">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'settings'
                ? 'border-[#4e80ee] text-[#4e80ee]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'analytics'
                ? 'border-[#4e80ee] text-[#4e80ee]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
            >
              Analytics
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'settings' ? (
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Platform</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700">
                    {source.platform}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SourceStatus)}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] outline-none shadow-sm transition-all"
                  >
                    <option value="Active">Operational (Online)</option>
                    <option value="Paused">Standby (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Listing URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={source.propertyUrl}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-500 shadow-inner"
                  />
                  <a href={source.propertyUrl} target="_blank" rel="noreferrer" className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-[#4e80ee] hover:border-[#4e80ee] rounded-xl shadow-sm transition-all">
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Sync Frequency</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Hourly', 'Daily', 'Weekly'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSyncSchedule(s as SyncSchedule)}
                      className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${syncSchedule === s
                        ? 'bg-blue-50 border-blue-200 text-[#4e80ee] shadow-sm'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                        }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danger Zone - Premium styling */}
              <div className="pt-8 border-t border-gray-100/50">
                <div className="bg-rose-50/30 border border-rose-100 rounded-2xl p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-rose-600 mb-1">
                        <AlertTriangle size={16} />
                        <h4 className="text-[12px] font-black uppercase tracking-tight">Delete Source</h4>
                      </div>
                      <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Removing this source will archive its history.</p>
                    </div>
                    <button
                      onClick={() => onDelete(source.id)}
                      className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                    >
                      Remove Source
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
                  <TrendingUp className="text-blue-600 mb-3" size={24} />
                  <p className="text-[12px] font-black text-blue-700/60 uppercase tracking-widest">Efficiency</p>
                  <h3 className="text-4xl font-black text-blue-900 mt-1">{source.successRate}%</h3>
                  <p className="text-xs font-bold text-blue-600 mt-2">Historical success rate</p>
                </div>
                <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                  <ShieldCheck className="text-emerald-600 mb-3" size={24} />
                  <p className="text-[12px] font-black text-emerald-700/60 uppercase tracking-widest">Reliability</p>
                  <h3 className="text-4xl font-black text-emerald-900 mt-1">Excellent</h3>
                  <p className="text-xs font-bold text-emerald-600 mt-2">Stable connection detected</p>
                </div>
                <div className="bg-purple-50/50 p-6 rounded-3xl border border-purple-100">
                  <Globe className="text-purple-600 mb-3" size={24} />
                  <p className="text-[12px] font-black text-purple-700/60 uppercase tracking-widest">Data Volume</p>
                  <h3 className="text-4xl font-black text-purple-900 mt-1">428</h3>
                  <p className="text-xs font-bold text-purple-600 mt-2">Total reviews retrieved</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[32px] p-8">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Synchronization Timeline</h4>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.1)]" />
                      <div className="w-0.5 h-12 bg-gray-200 mt-2" />
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="text-sm font-bold text-gray-900">Last Synchronization Completed</p>
                      <p className="text-xs font-medium text-gray-500 mt-1">
                        Successfully fetched 12 new reviews on {source.lastSyncedAt ? new Date(source.lastSyncedAt).toLocaleString() : 'Never'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Next Scheduled Pulse</p>
                      <p className="text-xs font-medium text-gray-500 mt-1">
                        Estimated trigger: {source.nextRunAt ? new Date(source.nextRunAt).toLocaleString() : 'Not scheduled'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
          >
            Close Node
          </button>
          <button
            onClick={handleSave}
            className="bg-[#4e80ee] hover:bg-blue-600 text-white px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5 active:scale-95 shadow-md shadow-blue-200/50"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSourceModal;
