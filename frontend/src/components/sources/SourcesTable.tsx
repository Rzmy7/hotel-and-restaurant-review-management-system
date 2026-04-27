import { useState, useRef } from "react";
import {
  Play,
  Pause,
  Square,
  Edit2,
  Trash2,
  Calendar,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { Source } from "../../types/sources";

// Brand Logos
import BookingLogo from "../../assets/source-logo/Booking.jpeg";
import AgodaLogo from "../../assets/source-logo/agoda.jpeg";
import AirbnbLogo from "../../assets/source-logo/airbnb.jpeg";
import TripAdvisorLogo from "../../assets/source-logo/tripAdvisor.jpeg";
import GoogleLogo from "../../assets/source-logo/Google.jpeg";

interface SourcesTableProps {
  sources: Source[];
  onEdit: (source: Source, tab?: "settings" | "analytics") => void;
  onDelete: (id: string | number) => void;
  onToggleStatus: (source: Source) => void;
  onSync: (id: string | number) => Promise<void> | void;
  onStopSync: (id: string | number) => Promise<void> | void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isStoppingSync?: boolean;
  isTogglingStatus?: boolean;
}

const PAGE_SIZE = 8;

const PlatformIcon = ({ platform }: { platform: string }) => {
  const baseClasses =
    "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border transition-all overflow-hidden bg-white";

  const getLogo = () => {
    switch (platform) {
      case "TripAdvisor":
        return TripAdvisorLogo;
      case "Booking.com":
        return BookingLogo;
      case "Agoda":
        return AgodaLogo;
      case "Airbnb":
        return AirbnbLogo;
      case "Google Reviews":
        return GoogleLogo;
      default:
        return null;
    }
  };

  const getFallbackStyles = () => {
    switch (platform) {
      case "Expedia":
        return "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800";
      case "Yelp":
        return "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800";
      case "Zomato":
        return "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/40 dark:text-red-400 dark:border-red-800";
      case "OpenTable":
        return "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800";
      case "Hotels.com":
        return "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400 dark:border-indigo-800";
      default:
        return "bg-gray-50 text-gray-400 border-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600";
    }
  };

  const logo = getLogo();

  if (logo) {
    return (
      <div className={baseClasses}>
        <img src={logo} alt={platform} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`${baseClasses} ${getFallbackStyles()}`}>{platform[0]}</div>
  );
};

import { useSyncProgress } from "../../hooks/useSyncProgress";

const SyncProgressBar = ({ sourceId }: { sourceId: string | number }) => {
  const { progress } = useSyncProgress(sourceId, true);

  if (!progress) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100/50 shadow-sm shadow-blue-50 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800/50 dark:shadow-none">
        <RefreshCw size={10} className="animate-spin" />
        Syncing
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1 w-24">
      <div className="flex items-center justify-between text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
        <span>Syncing</span>
        <span>{progress.percentage}%</span>
      </div>
      <div className="w-full h-1 bg-blue-100 dark:bg-blue-900/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
    </div>
  );
};

const StatusBadge = ({
  status,
  sourceId,
}: {
  status: Source["status"];
  sourceId: string | number;
}) => {
  switch (status) {
    case "Active":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm shadow-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/50 dark:shadow-none">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Active
        </span>
      );
    case "Paused":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-50 text-gray-500 border border-gray-100/50 shadow-sm shadow-gray-50 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700/50 dark:shadow-none">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
          Paused
        </span>
      );
    case "Error":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-100/50 shadow-sm shadow-rose-50 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800/50 dark:shadow-none">
          <AlertCircle size={10} />
          Error
        </span>
      );
    case "In Queue":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100/50 shadow-sm shadow-amber-50 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/50 dark:shadow-none">
          <Calendar size={10} />
          In Queue
        </span>
      );
    case "Syncing":
      return <SyncProgressBar sourceId={sourceId} />;
  }
};

const SourcesTable: React.FC<SourcesTableProps> = ({
  sources,
  onEdit,
  onDelete,
  onToggleStatus,
  onSync,
  onStopSync,
  isLoading = false,
  isDeleting = false,
  isStoppingSync = false,
  isTogglingStatus = false,
}) => {
  const [page, setPage] = useState(0);
  const [localSyncingIds, setLocalSyncingIds] = useState<Set<string | number>>(
    new Set(),
  );
  const inFlightSyncsRef = useRef<Set<string | number>>(new Set());

  const handleSyncClick = async (id: string | number) => {
    // Synchronous guard for rapid-fire clicking
    if (inFlightSyncsRef.current.has(id)) return;

    inFlightSyncsRef.current.add(id);
    setLocalSyncingIds((prev) => new Set(prev).add(id));

    try {
      await onSync(id);
    } finally {
      inFlightSyncsRef.current.delete(id);
      setLocalSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const totalPages = Math.max(1, Math.ceil(sources.length / PAGE_SIZE));
  const currentSources = sources.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100/50 dark:border-slate-700/50">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                Platform
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                Last Sync
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest text-center">
                Frequency
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">
                Success Rate
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-6">
                    <div className="h-10 bg-gray-50 dark:bg-slate-700 rounded" />
                  </td>
                </tr>
              ))
            ) : currentSources.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <div className="flex flex-col items-center">
                    <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-full mb-3 text-gray-300 dark:text-slate-500">
                      <RefreshCw size={32} />
                    </div>
                    <p className="text-gray-500 dark:text-slate-300 font-medium">
                      No sources connected yet
                    </p>
                    <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">
                      Add your first review platform to start collecting
                      insights
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              currentSources.map((source) => (
                <tr
                  key={source.id}
                  className="group hover:bg-blue-50/20 dark:hover:bg-blue-900/20 transition-colors"
                >
                  {/* Platform */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <PlatformIcon platform={source.platform} />
                      <div>
                        <button
                          onClick={() => onEdit(source, "analytics")}
                          disabled={
                            source.status === "In Queue" ||
                            source.status === "Syncing"
                          }
                          className="text-[13px] font-black text-gray-900 dark:text-white hover:text-[#4e80ee] dark:hover:text-blue-400 transition-colors uppercase tracking-tight text-left block disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {source.platform}
                        </button>
                        {source.platformStatus === "inactive" && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter bg-rose-50 text-rose-500 border border-rose-100/50">
                            Inactive
                          </span>
                        )}
                        <a
                          href={source.propertyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-gray-400 dark:text-slate-400 font-bold flex items-center gap-1 hover:text-[#4e80ee] dark:hover:text-blue-400 hover:underline transition-all mt-0.5 uppercase tracking-wider"
                        >
                          View Link <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-5">
                    <StatusBadge status={source.status} sourceId={source.id} />
                  </td>

                  {/* Last Synced */}
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(source.lastSyncedAt)}
                      </span>
                      {source.errorCount > 0 && (
                        <span className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-0.5">
                          {source.errorCount} failed attempts
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Schedule */}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest shadow-xs dark:shadow-none">
                      <Calendar
                        size={12}
                        className="text-gray-400 dark:text-slate-500"
                      />
                      {source.syncSchedule === "three_days"
                        ? "3 Days"
                        : source.syncSchedule.charAt(0).toUpperCase() +
                          source.syncSchedule.slice(1)}
                    </div>
                  </td>

                  {/* Success Rate */}
                  <td className="px-6 py-5">
                    {source.num_of_syncs === 0 &&
                    source.platform_num_of_syncs === 0 ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 uppercase tracking-tight">
                        Unknown
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-gray-100 dark:bg-slate-700/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              source.successRate > 90
                                ? "bg-emerald-500"
                                : source.successRate > 70
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                            }`}
                            style={{ width: `${source.successRate}%` }}
                          />
                        </div>
                        <span
                          className={`text-[13px] font-bold tabular-nums ${
                            source.successRate > 90
                              ? "text-emerald-600 dark:text-emerald-400"
                              : source.successRate > 70
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {source.successRate}%
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSyncClick(source.id)}
                        disabled={
                          source.platformStatus === "inactive" ||
                          source.status === "Paused" ||
                          source.status === "In Queue" ||
                          source.status === "Syncing" ||
                          localSyncingIds.has(source.id)
                        }
                        className="p-2 text-[#4e80ee] hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                        title={
                          source.platformStatus === "inactive"
                            ? `Platform ${source.platform} is disabled by admin`
                            : source.status === "Paused"
                              ? "Resume source to sync"
                              : source.status === "In Queue" ||
                                  source.status === "Syncing" ||
                                  localSyncingIds.has(source.id)
                                ? "Sync in progress"
                                : "Sync Now"
                        }
                      >
                        <RefreshCw
                          size={18}
                          className={
                            source.status === "Syncing" ||
                            localSyncingIds.has(source.id)
                              ? "animate-spin"
                              : ""
                          }
                        />
                      </button>
                      {source.status === "Syncing" ||
                      source.status === "In Queue" ? (
                        /* STOP button — shown when scraping is in progress */
                        <button
                          onClick={() => onStopSync(source.id)}
                          disabled={isStoppingSync}
                          className="p-2 text-rose-500 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/40 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Stop Sync"
                        >
                          {isStoppingSync ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Square size={18} fill="currentColor" />
                          )}
                        </button>
                      ) : (
                        /* PLAY/PAUSE button — toggles scheduled scraping */
                        <button
                          onClick={() => onToggleStatus(source)}
                          disabled={isTogglingStatus}
                          className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                            source.status === "Active"
                              ? "text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/40"
                              : "text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                          }`}
                          title={
                            source.status === "Active"
                              ? "Pause scheduled scraping"
                              : "Resume scheduled scraping"
                          }
                        >
                          {isTogglingStatus ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : source.status === "Active" ? (
                            <Pause size={18} />
                          ) : (
                            <Play size={18} />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(source)}
                        disabled={
                          source.status === "In Queue" ||
                          source.status === "Syncing"
                        }
                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-slate-700 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Edit Settings"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to remove this source? All associated data will be archived.",
                            )
                          ) {
                            onDelete(source.id);
                          }
                        }}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 dark:hover:text-rose-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove Source"
                      >
                        {isDeleting ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
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
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500 dark:text-slate-400">
            Showing{" "}
            <span className="text-gray-900 dark:text-white">
              {page * PAGE_SIZE + 1}
            </span>{" "}
            to{" "}
            <span className="text-gray-900 dark:text-white">
              {Math.min((page + 1) * PAGE_SIZE, sources.length)}
            </span>{" "}
            of{" "}
            <span className="text-gray-900 dark:text-white">
              {sources.length}
            </span>{" "}
            sources
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-800 transition-all shadow-xs"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
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
