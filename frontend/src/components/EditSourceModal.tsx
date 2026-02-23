import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  BarChart3,
  Trash2,
  ShieldCheck,
  Globe,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { Source } from '../types/sources';

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onSave: (source: Source) => void;
  onDelete: (sourceId: number) => void;
}

const EditSourceModal = ({ isOpen, onClose, source, onSave, onDelete }: EditSourceModalProps) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'stats'>('settings');
  const [platform, setPlatform] = useState('');
  const [propertyUrl, setPropertyUrl] = useState('');
  const [syncSchedule, setSyncSchedule] = useState<'Hourly' | 'Daily' | 'Weekly'>('Daily');
  const [status, setStatus] = useState<'Active' | 'Paused'>('Active');

  useEffect(() => {
    if (source) {
      setPlatform(source.platform);
      setPropertyUrl(source.propertyUrl);
      setSyncSchedule(source.syncSchedule);
      setStatus(source.status === 'Error' ? 'Active' : source.status as any);
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const handleSave = () => {
    if (source) {
      onSave({
        ...source,
        platform: platform as any,
        propertyUrl,
        syncSchedule,
        status: status as any
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-[32px] w-full max-w-[900px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Settings size={20} />
              </span>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Source Management</h2>
            </div>
            <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
              Configuring <span className="text-gray-900 font-bold">{source.platform}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full" />
              ID: {source.id}
            </p>
          </div>
          <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white rounded-2xl transition-all shadow-sm" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-10 flex border-b border-gray-100 bg-white">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-5 px-6 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            <Settings size={18} /> Configuration
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-5 px-6 text-sm font-bold flex items-center gap-2 transition-all border-b-2 ${activeTab === 'stats' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
          >
            <BarChart3 size={18} /> Detailed Analytics
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === 'settings' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Platform Identity</label>
                  <div className="p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-blue-600 shadow-sm">
                        {source.platform[0]}
                      </div>
                      <span className="font-bold text-gray-900">{source.platform}</span>
                    </div>
                    <ShieldCheck size={20} className="text-emerald-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Source URL</label>
                  <div className="relative group">
                    <input
                      className="w-full pl-5 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:border-blue-500/20 transition-all outline-none"
                      value={propertyUrl}
                      onChange={(e) => setPropertyUrl(e.target.value)}
                    />
                    <a
                      href={propertyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm bg-gray-50"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Synchronization Frequency</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Hourly', 'Daily', 'Weekly'].map((sched) => (
                      <button
                        key={sched}
                        onClick={() => setSyncSchedule(sched as any)}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border-2 ${syncSchedule === sched
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-100'
                          }`}
                      >
                        {sched}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Operational Status</label>
                  <div
                    onClick={() => setStatus(status === 'Active' ? 'Paused' : 'Active')}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer group ${status === 'Active' ? 'border-emerald-500 bg-emerald-50/30' : 'border-amber-500 bg-amber-50/30'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {status === 'Active' ? (
                          <RefreshCw size={24} className="text-emerald-500 animate-[spin_4s_linear_infinite]" />
                        ) : (
                          <Clock size={24} className="text-amber-500" />
                        )}
                        <div>
                          <p className={`text-sm font-black uppercase tracking-widest ${status === 'Active' ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {status}
                          </p>
                          <p className="text-xs font-medium text-gray-500 mt-0.5">
                            {status === 'Active' ? 'Reviews are being synced' : 'Aggregation is currently paused'}
                          </p>
                        </div>
                      </div>
                      <div className={`w-10 h-6 rounded-full relative transition-colors ${status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${status === 'Active' ? 'right-1' : 'left-1'}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-rose-50 rounded-2xl border-2 border-rose-100">
                  <h4 className="text-sm font-black text-rose-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <AlertTriangle size={16} /> Danger Zone
                  </h4>
                  <p className="text-xs font-medium text-rose-600 mb-4 leading-relaxed">
                    Removing this source will cease all data collection. Historical reviews will remain archived but no further updates will occur.
                  </p>
                  <button
                    onClick={() => onDelete(source.id)}
                    className="w-full py-3 bg-white hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Disconnect Source
                  </button>
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
        <div className="px-10 py-8 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-4">
          <button
            className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-sm font-black shadow-xl shadow-gray-200 transition-all transform hover:-translate-y-0.5"
            onClick={handleSave}
          >
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditSourceModal;
