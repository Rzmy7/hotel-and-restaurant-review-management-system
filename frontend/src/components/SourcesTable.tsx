import { useState } from 'react';
import { Play, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface Source {
  id: number;
  platform: string;
  status: 'Active' | 'Paused' | 'Error';
  lastSynced: string;
  schedule: string;
}

interface SourcesTableProps {
  sources: Source[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditSource: (source: any) => void;
}

/* ── Platform logo helper ── */
const PLATFORM_LOGOS: Record<string, { bg: string; letter: string; color: string }> = {
  'TripAdvisor': { bg: 'bg-green-500', letter: 'T', color: 'text-white' },
  'Booking.com': { bg: 'bg-blue-800', letter: 'B', color: 'text-white' },
  'Google Reviews': { bg: 'bg-white', letter: 'G', color: 'text-blue-500' },
  'Airbnb': { bg: 'bg-rose-500', letter: 'A', color: 'text-white' },
};

const PlatformLogo = ({ platform }: { platform: string }) => {
  const cfg = PLATFORM_LOGOS[platform] ?? { bg: 'bg-gray-200', letter: platform[0], color: 'text-gray-600' };
  return (
    <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center border border-gray-200 shrink-0 text-sm font-bold ${cfg.color}`}>
      {cfg.letter}
    </div>
  );
};

/* ── Status badge ── */
const StatusBadge = ({ status }: { status: Source['status'] }) => {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
        Active
      </span>
    );
  }
  if (status === 'Paused') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5" />
        Paused
      </span>
    );
  }
  // Error
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      <AlertCircle size={12} className="mr-1" />
      Error
    </span>
  );
};

/* ── Pagination config ── */
const PAGE_SIZE = 7;

const SourcesTable = ({ sources, onEditSource }: SourcesTableProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(sources.length / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const paged = sources.slice(start, start + PAGE_SIZE);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source Platform</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Synced</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">
                  No sources found.
                </td>
              </tr>
            )}
            {paged.map((source) => (
              <tr key={source.id} className="group hover:bg-gray-50 transition-colors">
                {/* Platform */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <PlatformLogo platform={source.platform} />
                    <span className="font-medium text-gray-900">{source.platform}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-6 py-5">
                  <StatusBadge status={source.status} />
                </td>

                {/* Last Synced */}
                <td className="px-6 py-5 text-sm text-gray-500">{source.lastSynced}</td>

                {/* Schedule */}
                <td className="px-6 py-5 text-sm text-gray-900">{source.schedule}</td>

                {/* Actions */}
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Run / Retry */}
                    {source.status === 'Error' ? (
                      <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors opacity-50 cursor-not-allowed">
                        <Play size={13} />
                        Retry
                      </button>
                    ) : (
                      <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                        <Play size={13} />
                        Run Now
                      </button>
                    )}

                    {/* Hover-reveal edit + delete */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-gray-100 transition-colors"
                        title="Edit"
                        onClick={() => onEditSource(source)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-gray-100 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="bg-white px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-900">{sources.length === 0 ? 0 : start + 1}</span> to{' '}
          <span className="font-medium text-gray-900">{Math.min(start + PAGE_SIZE, sources.length)}</span> of{' '}
          <span className="font-medium text-gray-900">{sources.length}</span> results
        </span>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-sm border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 text-sm border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourcesTable;
