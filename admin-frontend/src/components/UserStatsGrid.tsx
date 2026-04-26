import React from "react";
import { Users, UserCheck, UserPlus, TrendingUp, Activity } from "lucide-react";

interface UserStatsGridProps {
  allActiveUsers: number;
  todayActiveUsers: number;
  todayRegistered: number;
}

export const UserStatsGrid: React.FC<UserStatsGridProps> = ({
  allActiveUsers,
  todayActiveUsers,
  todayRegistered,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* All Active Users */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
            <Users size={24} />
          </div>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400 text-xs font-semibold">
            All time
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-slate-400 text-sm mb-2">
            All Active Users
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {allActiveUsers}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-slate-500">
            <TrendingUp size={13} />
            <span>Total active</span>
          </div>
        </div>
      </div>

      {/* Today Active Users */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
            <UserCheck size={24} />
          </div>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400 text-xs font-semibold">
            Today
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-slate-400 text-sm mb-2">
            Today Active Users
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {todayActiveUsers}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-slate-500">
            <Activity size={13} />
            <span>Online today</span>
          </div>
        </div>
      </div>

      {/* Today Registered */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 dark:text-blue-400">
            <UserPlus size={24} />
          </div>
          <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full text-blue-500 dark:text-blue-400 text-xs font-semibold">
            Today
          </div>
        </div>
        <div>
          <div className="text-gray-500 dark:text-slate-400 text-sm mb-2">
            Today Registered
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {todayRegistered}
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-slate-500">
            <span className="w-1.5 h-1.5 bg-gray-400 dark:bg-slate-500 rounded-full"></span>
            <span>New signups</span>
          </div>
        </div>
      </div>
    </div>
  );
};
