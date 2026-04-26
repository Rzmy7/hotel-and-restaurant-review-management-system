import React, { useMemo, useEffect, useState, useRef } from "react";
import {
  X,
  Star,
  BarChart2,
  Globe,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { useOrganizationStore } from "../../stores/useOrganizationStore";

/* ── Types for the backend response ─────────────────────────────── */
interface DistributionEntry {
  rating: number;
  count: number;
  percentage: number;
}

interface SourceDistribution {
  name: string;
  total: number;
  average: number;
  distribution: DistributionEntry[];
}

interface FullDistributionResponse {
  global: {
    total: number;
    average: number;
    distribution: DistributionEntry[];
  };
  sources: SourceDistribution[];
}

/* ── Component ──────────────────────────────────────────────────── */
interface ReviewDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewDistributionModal: React.FC<
  ReviewDistributionModalProps
> = ({ isOpen, onClose }) => {
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const [data, setData] = useState<FullDistributionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("All Sources");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch distribution data from backend when modal opens
  useEffect(() => {
    if (!isOpen || !currentOrg?.id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get<FullDistributionResponse>("/reviews/meta/distribution", {
        organization_id: currentOrg.id,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError("Failed to load distribution data.");
        console.error("Distribution fetch error:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, currentOrg?.id]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedSource("All Sources");
      setDropdownOpen(false);
    }
  }, [isOpen]);

  // Derive active data from the selected source
  const activeData = useMemo(() => {
    if (!data) return null;

    if (selectedSource === "All Sources") {
      return data.global;
    }

    const sourceData = data.sources.find((s) => s.name === selectedSource);
    return sourceData ?? null;
  }, [data, selectedSource]);

  // Build distribution rows with global comparison percentages
  const distributionRows = useMemo(() => {
    if (!activeData || !data) return [];

    const isGlobal = selectedSource === "All Sources";
    const globalDist = data.global.distribution;

    return activeData.distribution.map((dist) => {
      const globalEntry = globalDist.find((g) => g.rating === dist.rating);
      const globalCount = globalEntry?.count || 0;
      const globalPercentage = isGlobal
        ? null
        : globalCount > 0
          ? Math.round((dist.count / Math.max(1, globalCount)) * 100)
          : 0;

      return {
        ...dist,
        globalPercentage,
      };
    });
  }, [activeData, data, selectedSource]);

  const availableSources = data?.sources.map((s) => s.name).sort() || [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-gray-900/40 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] px-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 w-full max-w-[500px] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-gray-100 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 sticky top-0 z-10 backdrop-blur-md shrink-0">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-[#5988EF] shadow-sm">
                <BarChart2 size={20} />
              </div>
              <div>
                <h2 className="text-[17px] font-black text-gray-900 dark:text-white tracking-tight">
                  Review Distribution
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white transition-colors bg-white border border-gray-100 dark:bg-slate-700 dark:border-slate-600 shadow-sm"
            >
              <X size={16} />
            </button>
          </div>

          {/* Source Selection Dropdown Section */}
          {activeData && activeData.total > 0 && (
            <div className="px-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-gray-50 dark:border-slate-700 pt-4 bg-gray-50/20 dark:bg-slate-800/50">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                Source
              </label>
              <div className="relative flex-1" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-full flex items-center justify-between bg-white dark:bg-slate-700 border ${dropdownOpen ? "border-[#5988EF] ring-2 ring-[#5988EF]/20" : "border-gray-200 dark:border-slate-600"} text-gray-800 dark:text-gray-200 text-[13px] font-bold rounded-xl px-4 py-2 outline-none hover:border-[#5988EF] transition-all shadow-sm`}
                >
                  <span className="truncate">
                    {selectedSource === "All Sources"
                      ? "All Sources (Global Overview)"
                      : selectedSource}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-xl shadow-gray-200/50 dark:shadow-none z-50 p-2 max-h-60 overflow-y-auto custom-scrollbar animate-in slide-in-from-top-2 duration-150">
                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setSelectedSource("All Sources");
                          setDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between w-full px-3 py-2 text-[13px] font-bold text-left rounded-lg transition-all ${
                          selectedSource === "All Sources"
                            ? "bg-blue-50 text-[#5988EF] dark:bg-blue-900/30 dark:text-blue-400"
                            : "hover:bg-gray-50 text-gray-600 dark:hover:bg-slate-700 dark:text-gray-300"
                        }`}
                      >
                        <span>All Sources (Global Overview)</span>
                        {selectedSource === "All Sources" && (
                          <Check size={14} className="text-[#5988EF]" />
                        )}
                      </button>

                      {availableSources.map((src) => {
                        const isSelected = selectedSource === src;
                        return (
                          <button
                            key={src}
                            onClick={() => {
                              setSelectedSource(src);
                              setDropdownOpen(false);
                            }}
                            className={`flex items-center justify-between w-full px-3 py-2 text-[13px] font-bold text-left rounded-lg transition-all ${
                              isSelected
                                ? "bg-blue-50 text-[#5988EF] dark:bg-blue-900/30 dark:text-blue-400"
                                : "hover:bg-gray-50 text-gray-600 dark:hover:bg-slate-700 dark:text-gray-300"
                            }`}
                          >
                            <span>{src}</span>
                            {isSelected && (
                              <Check size={14} className="text-[#5988EF]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/40 dark:bg-slate-800/40">
          {loading ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <Loader2 size={28} className="text-[#5988EF] animate-spin mb-3" />
              <p className="text-gray-500 dark:text-slate-400 text-[12px] font-medium">
                Loading distribution data…
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-3">
                <BarChart2 size={24} className="text-red-400" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                Error
              </h3>
              <p className="text-gray-500 dark:text-slate-400 text-[12px] font-medium">
                {error}
              </p>
            </div>
          ) : !activeData ? (
            <div className="text-center py-10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                <BarChart2 size={24} className="text-gray-300" />
              </div>
              <h3 className="text-[14px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                No Data Available
              </h3>
              <p className="text-gray-500 dark:text-slate-400 text-[12px] font-medium">
                There are currently no reviews available to display.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
              {/* Selected Source Header */}
              <div className="flex justify-between items-center mb-6 pb-5 border-b border-gray-50 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-black shadow-md text-sm ${selectedSource === "All Sources" ? "bg-gradient-to-br from-indigo-500 to-blue-600" : "bg-gradient-to-br from-[#5988EF] to-cyan-500"}`}
                  >
                    {selectedSource === "All Sources" ? (
                      <Globe size={16} />
                    ) : (
                      selectedSource.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black text-gray-800 dark:text-white leading-tight">
                      {selectedSource}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                      {activeData.total.toLocaleString()} Total Reviews
                    </p>
                  </div>
                </div>
                <div className="bg-[#5988EF]/10 border border-[#5988EF]/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <Star size={14} className="fill-[#5988EF] text-[#5988EF]" />
                  <span className="text-[15px] font-black text-[#5988EF]">
                    {activeData.average}
                  </span>
                </div>
              </div>

              {/* Distribution Bars */}
              <div className="flex flex-col gap-4">
                {distributionRows.map((dist) => (
                  <div
                    key={dist.rating}
                    className="flex flex-col gap-1.5 w-full group cursor-default"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5 min-w-[36px]">
                        <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 group-hover:text-amber-500 transition-colors">
                          {dist.rating}
                        </span>
                        <Star
                          size={14}
                          className="text-amber-400 fill-amber-400 group-hover:text-amber-500 group-hover:fill-amber-500 transition-colors"
                        />
                      </div>

                      <div className="flex items-end flex-col">
                        <span className="text-[13px] text-gray-800 dark:text-gray-200 font-black">
                          {dist.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out bg-[#5988EF] shadow-md group-hover:brightness-110"
                        style={{ width: `${dist.percentage}%` }}
                      />
                    </div>

                    {/* Global Comparison Detail & Count */}
                    <div className="flex justify-between items-center text-[11px] mt-0.5">
                      <span className="text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        {dist.count.toLocaleString()} Reviews
                      </span>

                      {dist.globalPercentage !== null ? (
                        <span className="text-gray-500 dark:text-slate-400 font-semibold px-2 py-0.5 bg-gray-50 dark:bg-slate-700 rounded-md">
                          {dist.globalPercentage}% of all {dist.rating}★
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 font-semibold">
                          Global
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-[12px] font-black text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-slate-600 dark:hover:text-white transition-all shadow-sm uppercase tracking-widest"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewDistributionModal;
