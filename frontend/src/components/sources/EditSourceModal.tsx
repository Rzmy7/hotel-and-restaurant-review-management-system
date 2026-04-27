import { useState, useEffect } from "react";
import {
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Globe,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Source, SourceStatus, SyncSchedule } from "../../types/sources";

// Brand Logos
import BookingLogo from "../../assets/source-logo/Booking.jpeg";
import AgodaLogo from "../../assets/source-logo/agoda.jpeg";
import AirbnbLogo from "../../assets/source-logo/airbnb.jpeg";
import TripAdvisorLogo from "../../assets/source-logo/tripAdvisor.jpeg";
import GoogleLogo from "../../assets/source-logo/Google.jpeg";

interface EditSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: Source | null;
  onSave: (source: Source) => void;
  onDelete: (sourceId: string | number) => void;
  onClearReviews?: (sourceId: string | number) => void;
  isSaving?: boolean;
  isDeleting?: boolean;
  isClearingReviews?: boolean;
  initialTab?: "settings" | "analytics";
}

const EditSourceModal = ({
  isOpen,
  onClose,
  source,
  onSave,
  onDelete,
  onClearReviews,
  isSaving = false,
  isDeleting = false,
  isClearingReviews = false,
  initialTab = "settings",
}: EditSourceModalProps) => {
  const [activeTab, setActiveTab] = useState<"settings" | "analytics">(
    initialTab,
  );
  const [syncSchedule, setSyncSchedule] = useState<SyncSchedule>("daily");
  const [status, setStatus] = useState<SourceStatus>("Active");
  const [propertyUrl, setPropertyUrl] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (source) {
      setSyncSchedule(source.syncSchedule);
      setStatus(source.status === "Error" ? "Active" : source.status);
      setPropertyUrl(source.propertyUrl);
    }
  }, [source]);

  if (!isOpen || !source) return null;

  const getLogo = () => {
    switch (source.platform) {
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
    switch (source.platform) {
      case "Expedia":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "Yelp":
        return "bg-rose-50 text-rose-600 border-rose-100";
      case "Zomato":
        return "bg-red-50 text-red-600 border-red-100";
      case "OpenTable":
        return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Hotels.com":
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      default:
        return "bg-blue-50 text-[#4e80ee] border-blue-100/50";
    }
  };

  const logo = getLogo();
  const fallbackStyles = getFallbackStyles();

  const handleSave = () => {
    onSave({
      ...source,
      propertyUrl,
      syncSchedule,
      status,
    });
    onClose();
  };

  const handleClearReviews = () => {
    if (
      window.confirm(
        "Are you absolutely sure you want to delete ALL reviews for this source? This will ALSO clear related media and embeddings. Action cannot be undone.",
      )
    ) {
      onClearReviews?.(source.id);
    }
  };

  const handleDeleteSource = () => {
    if (
      window.confirm(
        "Are you sure you want to remove this source? This will disconnect the platform and archive all associated data.",
      )
    ) {
      onDelete(source.id);
    }
  };

  const customHeader = (
    <div className="px-8 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white/80 dark:bg-slate-800/80 backdrop-blur-md sticky top-0 z-10 w-full">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm uppercase tracking-tighter overflow-hidden bg-white dark:bg-slate-800 border dark:border-slate-700 ${fallbackStyles}`}
        >
          {logo ? (
            <img
              src={logo}
              alt={source.platform}
              className="w-full h-full object-cover"
            />
          ) : (
            source.platform[0]
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Source Configuration
            </h2>
            <span
              className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-slate-400 border border-gray-200 dark:border-slate-600`}
            >
              ID: #{source.id}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
            {source.platform} Source
          </p>
        </div>
      </div>
      {/* The generic Modal will provide the Close button */}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-end gap-3 w-full">
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={isSaving || isDeleting || isClearingReviews}
        className="text-[11px] uppercase tracking-widest px-6"
      >
        Close Node
      </Button>
      <Button
        onClick={handleSave}
        isLoading={isSaving}
        disabled={isDeleting || isClearingReviews}
        className="px-8 text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
      >
        Save Changes
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      footer={footer}
      className="max-w-4xl"
    >
      <div className="flex flex-col w-full h-full">
        {customHeader}

        {/* Tab Navigation - Sophisticated branding */}
        <div className="px-8 bg-gray-50/30 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-700 w-full">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === "settings"
                  ? "border-[#4e80ee] text-[#4e80ee]"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-gray-300"
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`pb-4 px-2 text-sm font-bold transition-all border-b-2 ${
                activeTab === "analytics"
                  ? "border-[#4e80ee] text-[#4e80ee]"
                  : "border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-gray-300"
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === "settings" ? (
            <div className="space-y-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    Platform
                  </label>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl font-bold text-gray-700 dark:text-gray-300">
                    {source.platform}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SourceStatus)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] outline-none shadow-sm transition-all"
                  >
                    <option value="Active">Operational (Online)</option>
                    <option value="Paused">Standby (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                  Listing URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={propertyUrl}
                    onChange={(e) => setPropertyUrl(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl font-bold text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] outline-none shadow-sm transition-all"
                    placeholder="https://..."
                  />
                  <a
                    href={propertyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white border border-gray-200 text-gray-400 hover:text-[#4e80ee] hover:border-[#4e80ee] dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:hover:text-[#4e80ee] dark:hover:border-[#4e80ee] rounded-xl shadow-sm transition-all"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">
                  Sync Frequency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: "daily", label: "Daily" },
                    { val: "three_days", label: "3 Days" },
                    { val: "weekly", label: "Weekly" },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setSyncSchedule(s.val as SyncSchedule)}
                      className={`py-3 rounded-xl text-[11px] font-black uppercase tracking-widest border transition-all ${
                        syncSchedule === s.val
                          ? "bg-blue-50 border-blue-200 text-[#4e80ee] dark:bg-blue-900/30 dark:border-blue-800/50 dark:text-blue-400 shadow-sm"
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700 dark:hover:border-slate-600"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Danger Zone - Premium styling */}
              <div className="pt-8 border-t border-gray-100/50 dark:border-slate-700/50 space-y-4">
                <div className="bg-amber-50/30 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30 rounded-2xl p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                        <AlertTriangle size={16} />
                        <h4 className="text-[12px] font-black uppercase tracking-tight text-amber-700 dark:text-amber-300">
                          Clean Slate
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-slate-500 font-bold uppercase tracking-wider">
                        Delete only the review records. The source stays
                        connected.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleClearReviews}
                      isLoading={isClearingReviews}
                      disabled={isSaving || isDeleting}
                      className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest shadow-sm border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/40"
                    >
                      Clear Reviews
                    </Button>
                  </div>
                </div>

                <div className="bg-rose-50/30 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800/30 rounded-2xl p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-1">
                        <AlertTriangle size={16} />
                        <h4 className="text-[12px] font-black uppercase tracking-tight">
                          Delete Source
                        </h4>
                      </div>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                        Removing this source will archive its history and
                        disconnect it.
                      </p>
                    </div>
                    <Button
                      variant="danger"
                      onClick={handleDeleteSource}
                      isLoading={isDeleting}
                      disabled={isSaving || isClearingReviews}
                      className="px-6 py-2.5 text-[11px] font-black uppercase tracking-widest shadow-sm"
                    >
                      Remove Source
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50/50 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30 p-6 rounded-3xl">
                  <TrendingUp
                    className="text-blue-600 dark:text-blue-400 mb-3"
                    size={24}
                  />
                  <p className="text-[12px] font-black text-blue-700/60 dark:text-blue-300/60 uppercase tracking-widest">
                    Efficiency
                  </p>
                  <h3 className="text-4xl font-black text-blue-900 dark:text-white mt-1">
                    {source.successRate}%
                  </h3>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2">
                    Historical success rate
                  </p>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30 p-6 rounded-3xl">
                  <ShieldCheck
                    className="text-emerald-600 dark:text-emerald-400 mb-3"
                    size={24}
                  />
                  <p className="text-[12px] font-black text-emerald-700/60 dark:text-emerald-300/60 uppercase tracking-widest">
                    Reliability
                  </p>
                  <h3 className="text-4xl font-black text-emerald-900 dark:text-white mt-1">
                    Excellent
                  </h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    Stable connection detected
                  </p>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800/30 p-6 rounded-3xl">
                  <Globe
                    className="text-purple-600 dark:text-purple-400 mb-3"
                    size={24}
                  />
                  <p className="text-[12px] font-black text-purple-700/60 dark:text-purple-300/60 uppercase tracking-widest">
                    Data Volume
                  </p>
                  <h3 className="text-4xl font-black text-purple-900 dark:text-white mt-1">
                    428
                  </h3>
                  <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-2">
                    Total reviews retrieved
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-800 rounded-[32px] p-8">
                <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">
                  Synchronization Timeline
                </h4>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_0_4px_rgba(16,185,129,0.1)]" />
                      <div className="w-0.5 h-12 bg-gray-200 dark:bg-slate-700 mt-2" />
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Last Synchronization Completed
                      </p>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                        Successfully fetched 12 new reviews on{" "}
                        {source.lastSyncedAt
                          ? new Date(source.lastSyncedAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        Next Scheduled Pulse
                      </p>
                      <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                        Estimated trigger:{" "}
                        {source.nextRunAt
                          ? new Date(source.nextRunAt).toLocaleString()
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default EditSourceModal;
