import React from "react";
import {
  UserPlus,
  UserMinus,
  Building2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Bot,
  Clock,
  Activity,
  Settings,
  Megaphone,
  Wrench,
  Trash2,
  Database,
} from "lucide-react";
import type { RecentActivity as RecentActivityType } from "../types";

interface RecentActivityProps {
  activities: RecentActivityType[];
  onViewAll?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  activities,
  onViewAll,
}) => {
  const getActivityIcon = (type: RecentActivityType["type"]) => {
    switch (type) {
      case "user_joined":
        return <UserPlus size={14} className="text-blue-500" />;
      case "org_created":
        return <Building2 size={14} className="text-purple-500" />;
      case "scrape_completed":
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "scrape_failed":
        return <XCircle size={14} className="text-red-500" />;
      case "subscription_changed":
        return <CreditCard size={14} className="text-amber-500" />;
      case "ai_job":
        return <Bot size={14} className="text-cyan-500" />;
      case "settings_updated":
        return <Settings size={14} className="text-indigo-500" />;
      case "broadcast_sent":
        return <Megaphone size={14} className="text-pink-500" />;
      case "maintenance_toggled":
        return <Wrench size={14} className="text-orange-500" />;
      case "user_deleted":
        return <UserMinus size={14} className="text-red-500" />;
      case "org_deleted":
        return <Trash2 size={14} className="text-red-500" />;
      case "embeddings_triggered":
        return <Database size={14} className="text-teal-500" />;
      default:
        return (
          <Clock size={14} className="text-gray-500 dark:text-slate-400" />
        );
    }
  };

  const getActivityBg = (type: RecentActivityType["type"]) => {
    switch (type) {
      case "user_joined":
        return "bg-blue-50 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:ring-blue-800/50";
      case "org_created":
        return "bg-purple-50 ring-1 ring-purple-100 dark:bg-purple-900/30 dark:ring-purple-800/50";
      case "scrape_completed":
        return "bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:ring-emerald-800/50";
      case "scrape_failed":
        return "bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50";
      case "subscription_changed":
        return "bg-amber-50 ring-1 ring-amber-100 dark:bg-amber-900/30 dark:ring-amber-800/50";
      case "ai_job":
        return "bg-cyan-50 ring-1 ring-cyan-100 dark:bg-cyan-900/30 dark:ring-cyan-800/50";
      case "settings_updated":
        return "bg-indigo-50 ring-1 ring-indigo-100 dark:bg-indigo-900/30 dark:ring-indigo-800/50";
      case "broadcast_sent":
        return "bg-pink-50 ring-1 ring-pink-100 dark:bg-pink-900/30 dark:ring-pink-800/50";
      case "maintenance_toggled":
        return "bg-orange-50 ring-1 ring-orange-100 dark:bg-orange-900/30 dark:ring-orange-800/50";
      case "user_deleted":
        return "bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50";
      case "org_deleted":
        return "bg-red-50 ring-1 ring-red-100 dark:bg-red-900/30 dark:ring-red-800/50";
      case "embeddings_triggered":
        return "bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-900/30 dark:ring-teal-800/50";
      default:
        return "bg-gray-50 ring-1 ring-gray-100 dark:bg-slate-700 dark:ring-slate-600";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-full hover:shadow-md hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-600 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <Activity size={18} className="text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
          >
            View All
          </button>
        )}
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-50 dark:divide-slate-700/50 max-h-[360px] overflow-y-auto flex-1">
        {activities.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 dark:text-slate-500">
            <Activity
              size={28}
              className="mx-auto mb-2 text-gray-300 dark:text-slate-600"
            />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Activity will appear here as it happens
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 dark:hover:bg-slate-700/30 transition-colors"
            >
              <div
                className={`flex-shrink-0 p-2 rounded-lg ${getActivityBg(activity.type)}`}
              >
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {activity.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Clock
                    size={10}
                    className="text-gray-400 dark:text-slate-500"
                  />
                  <span className="text-[11px] text-gray-400 dark:text-slate-500">
                    {activity.timestamp}
                  </span>
                  {activity.user && (
                    <>
                      <span className="text-gray-300 dark:text-slate-600">
                        ·
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-slate-400">
                        {activity.user}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
