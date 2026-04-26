import React from "react";
import { Activity } from "lucide-react";

interface ActiveUsersCardProps {
  activeUsersToday: number;
}

export const ActiveUsersCard: React.FC<ActiveUsersCardProps> = ({
  activeUsersToday,
}) => {
  const avatarColors = ["#bfdbfe", "#e9d5ff", "#fed7aa", "#bbf7d0", "#fecaca"];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
            Active Users Today
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {activeUsersToday.toLocaleString()}
          </p>
        </div>
        <div className="p-3 bg-green-100 rounded-lg">
          <Activity className="text-green-600" size={24} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex -space-x-2">
          {avatarColors.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border-2 border-white"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          +{activeUsersToday - 5} more online
        </span>
      </div>
    </div>
  );
};
