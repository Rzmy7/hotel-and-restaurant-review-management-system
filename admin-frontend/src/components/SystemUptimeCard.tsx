import React from "react";
import { Activity } from "lucide-react";

interface SystemUptimeCardProps {
  systemUptime: number;
}

export const SystemUptimeCard: React.FC<SystemUptimeCardProps> = ({
  systemUptime,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            System Uptime
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {systemUptime}%
          </p>
        </div>
        <div className="p-3 bg-emerald-100 rounded-lg">
          <Activity className="text-emerald-600" size={24} />
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full"
            style={{ width: `${systemUptime}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
          Last 30 days
        </p>
      </div>
    </div>
  );
};
