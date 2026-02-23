import { useState } from 'react';
import {
  Play,
  Pause,
  Edit2,
  Trash2,
  AlertCircle,
  Calendar,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import type { Source } from '../types/sources';

interface SourcesTableProps {
  sources: Source[];
  onEdit: (source: Source) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (source: Source) => void;
  onSync: (id: number) => void;
  isLoading?: boolean;
}

const PAGE_SIZE = 8;

const PlatformIcon = ({ platform }: { platform: string }) => {
  const baseClasses = "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border transition-all";

  switch (platform) {
    case 'TripAdvisor':
      return <div className={`${baseClasses} bg-[#34E0A1]/10 text-[#34E0A1] border-[#34E0A1]/20`}>T</div>;
    case 'Booking.com':
      return <div className={`${baseClasses} bg-[#003580]/10 text-[#003580] border-[#003580]/20`}>B</div>;
    case 'Google Reviews':
      return <div className={`${baseClasses} bg-white text-gray-700 border-gray-100 shadow-sm`}>G</div>;
    case 'Airbnb':
      return <div className={`${baseClasses} bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/20`}>A</div>;
    default:
      return <div className={`${baseClasses} bg-gray-50 text-gray-400 border-gray-200`}>{platform[0]}</div>;
  }
};

const StatusBadge = ({ status }: { status: Source['status'] }) => {
  switch (status) {
    case 'Active':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Active
        </span>
      );
    case 'Paused':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-gray-50 text-gray-600 border border-gray-100">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          Paused
        </span>
      );
    case 'Error':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
          <AlertCircle size={12} />
          Error
        </span>
      );
  }
};

const SourcesTable: React.FC<SourcesTableProps> = ({
  sources,
  onEdit,
  onDelete,
  onToggleStatus,
  onSync,
  isLoading
}) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(sources.length / PAGE_SIZE));
  const currentSources = sources.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100/50">
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Platform</th>
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Last Synced</th>
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Schedule</th>
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Success Rate</th>
              <th className="px-6 py-4 text-[12px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-6"><div className="h-10 bg-gray-50 rounded" /></td>
                </tr>
              ))
            ) : currentSources.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-50 rounded-full mb-3 text-gray-300">
                      <RefreshCw size={32} />
                    </div>
                    <p className="text-gray-500 font-medium">No sources connected yet</p>
                    <p className="text-sm text-gray-400 mt-1">Add your first review platform to start collecting insights</p>
                  </div>
                </td>
              </tr>
            ) : (
              currentSources.map((source) => (
                <tr key={source.id} className="group hover:bg-blue-50/20 transition-colors">
                  {/* Platform */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={source.platform} />
                      <div>
                        <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {source.platform}
                        </div>
                        <a
                          href={source.propertyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-gray-400 flex items-center gap-1 hover:text-blue-500 hover:underline transition-all mt-0.5"
                        >
                          View Property <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">
                    <StatusBadge status={source.status} />
                  </td>

                  {/* Last Synced */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">{formatDate(source.lastSyncedAt)}</span>
                      {source.errorCount > 0 && (
                        <span className="text-[11px] text-rose-500 font-medium mt-0.5">
                          {source.errorCount} failed attempts
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="px-6 py-5 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-gray-100 text-[12px] font-medium text-gray-600 shadow-xs">
                      <Calendar size={12} className="text-gray-400" />
                      {source.syncSchedule}
                    </div>
                  </td>

                  {/* Success Rate */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${source.successRate > 90 ? 'bg-emerald-500' :
                            source.successRate > 70 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                          style={{ width: `${source.successRate}%` }}
                        />
                      </div>
                      <span className={`text-[13px] font-bold ${source.successRate > 90 ? 'text-emerald-600' :
                        source.successRate > 70 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                        {source.successRate}%
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSync(source.id)}
                        disabled={source.status === 'Paused'}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Sync Now"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={() => onToggleStatus(source)}
                        className={`p-2 rounded-lg transition-all ${source.status === 'Active' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'
                          }`}
                        title={source.status === 'Active' ? 'Pause' : 'Resume'}
                      >
                        {source.status === 'Active' ? <Pause size={18} /> : <Play size={18} />}
                      </button>
                      <button
                        onClick={() => onEdit(source)}
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                        title="Edit Settings"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this source? All associated data will be archived.')) {
                            onDelete(source.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        title="Remove Source"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">
            Showing <span className="text-gray-900">{page * PAGE_SIZE + 1}</span> to <span className="text-gray-900">{Math.min((page + 1) * PAGE_SIZE, sources.length)}</span> of <span className="text-gray-900">{sources.length}</span> sources
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white transition-all shadow-xs"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-100 bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-all shadow-xs"
            >
              Next Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesTable;
