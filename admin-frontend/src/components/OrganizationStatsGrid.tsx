import React from "react";
import { Building2, CheckCircle2, TrendingUp } from "lucide-react";
import type { OrganizationStats } from "../types";

interface OrganizationStatsGridProps {
  stats: OrganizationStats;
}

export const OrganizationStatsGrid: React.FC<OrganizationStatsGridProps> = ({
  stats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Organizations */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 h-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
              <Building2 size={22} />
            </div>
            <div className="text-gray-500 dark:text-slate-400 text-sm truncate">
              Total Organizations
            </div>
          </div>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400 text-xs font-semibold shrink-0">
            All time
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 mt-4">
          <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {stats.total}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 shrink-0">
            <TrendingUp size={13} />
            <span>All registered organizations</span>
          </div>
        </div>
      </div>

      {/* Organizations Added Today */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 h-full">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400 shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div className="text-gray-500 dark:text-slate-400 text-sm truncate">
              Added Today
            </div>
          </div>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400 text-xs font-semibold shrink-0">
            Today
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 mt-4">
          <div className="text-3xl font-bold text-gray-900 dark:text-white leading-none">
            {stats.addedToday}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 shrink-0">
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-500 rounded-full"></span>
            <span>Newly registered</span>
          </div>
        </div>
      </div>
    </div>
  );
};
