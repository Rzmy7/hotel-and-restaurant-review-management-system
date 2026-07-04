import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Globe,
  Link,
  Key,
  Calendar,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import type { Source, SyncSchedule } from "../../types/sources";
import { sourcesService } from "../../services/sourcesService";
import { useAuth } from "../../contexts/AuthContext";
import { fetchSubscriptionUsage } from "../../services/subscriptionPlansService";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (source: any) => void;
  existingPlatformIds?: number[];
}

const AddSourceModal = ({
  isOpen,
  onClose,
  onSave,
  existingPlatformIds = [],
}: AddSourceModalProps) => {
  const { data: platforms = [], isLoading: isLoadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: () => sourcesService.getPlatforms(),
    enabled: isOpen,
  });

  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(
    null,
  );
  const [propertyUrl, setPropertyUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [schedule, setSchedule] = useState<SyncSchedule>("three_days");
  const [sourceStatus, setSourceStatus] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user?.user_id) {
      fetchSubscriptionUsage(user.user_id)
        .then((usage) => {
          const plan = (usage.planId || usage.planName || "free").toLowerCase();
          setUserPlan(plan);
        })
        .catch((err) => {
          console.error("Failed to fetch subscription usage:", err);
          setUserPlan("free");
        });
    }
  }, [isOpen, user?.user_id]);

  const isEligibleForDaily = (plan: string | null) => {
    if (!plan) return false;
    const normalized = plan.trim().toLowerCase();
    // ponytail: allow pro, professional, ultra, or enterprise plans
    return (
      normalized === "pro" ||
      normalized === "professional" ||
      normalized === "ultra" ||
      normalized === "enterprise"
    );
  };

  // Set default platform once loaded
  useEffect(() => {
    if (isOpen && platforms.length > 0 && !selectedPlatformId) {
      const firstAvailable = platforms.find(
        (p: any) => !existingPlatformIds.includes(p.platform_id),
      );
      if (firstAvailable) {
        setSelectedPlatformId(firstAvailable.platform_id);
      }
    }
  }, [isOpen, platforms, selectedPlatformId, existingPlatformIds]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!propertyUrl || !selectedPlatformId) return;

    onSave({
      platformId: selectedPlatformId,
      propertyUrl,
      syncSchedule: schedule,
      status: sourceStatus ? "Active" : "Paused",
    });
    onClose();
    // Reset form
    setSelectedPlatformId(null);
    setPropertyUrl("");
    setApiKey("");
    setSchedule("three_days");
  };

  const filteredPlatforms = platforms.filter((p: any) =>
    p.platform_name.toLowerCase().includes(searchQuery.toLowerCase()),
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
        disabled={!propertyUrl || !selectedPlatformId}
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
              <Globe
                size={12}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
              />
            </div>
          </div>

          <div className="max-h-[160px] overflow-y-auto pr-2 grid grid-cols-2 gap-3 custom-scrollbar">
            {isLoadingPlatforms ? (
              <div className="col-span-2 py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest animate-pulse">
                  Loading Platforms...
                </p>
              </div>
            ) : filteredPlatforms.length > 0 ? (
              filteredPlatforms.map((p: any) => {
                const isExisting = existingPlatformIds.includes(p.platform_id);
                return (
                  <button
                    key={p.platform_id}
                    disabled={isExisting}
                    onClick={() => setSelectedPlatformId(p.platform_id)}
                    title={
                      isExisting
                        ? "Platform is already added for this organization"
                        : undefined
                    }
                    className={`px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all text-left flex items-center justify-between ${
                      isExisting
                        ? "border-gray-100 bg-gray-100/30 text-gray-300 dark:border-slate-800/30 dark:bg-slate-800/30 dark:text-slate-600 cursor-not-allowed"
                        : selectedPlatformId === p.platform_id
                          ? "border-blue-600 bg-blue-50/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer"
                          : "border-gray-100 bg-gray-50/30 text-gray-500 hover:border-gray-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600 cursor-pointer"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {p.platform_name}
                      {isExisting && <span className="text-[10px]"></span>}
                    </span>
                    {selectedPlatformId === p.platform_id && (
                      <ShieldCheck size={16} />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="col-span-2 py-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700">
                <p className="text-xs text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                  No platforms found
                </p>
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
              <option value="daily" disabled={!isEligibleForDaily(userPlan)}>
                Once Daily{" "}
                {!isEligibleForDaily(userPlan) ? "🔒 (Pro/Ultra only)" : ""}
              </option>
              <option value="three_days">Every 3 Days</option>
              <option value="weekly">Once Weekly</option>
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
        <div className="pt-4 flex items-center justify-end border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Auto-Sync
            </span>
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
