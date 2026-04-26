import React from "react";
import { ServerCard } from "./ServerCard";
import type { ServerStatus } from "../types";

interface ServerStatsGridProps {
  servers: ServerStatus[];
  loading?: boolean;
}

const SkeletonCard: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200" />
        <div>
          <div className="h-4 w-28 bg-gray-200 rounded mb-1.5" />
          <div className="h-3 w-16 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="h-6 w-16 bg-gray-200 rounded-full" />
    </div>
    <div className="space-y-3">
      <div>
        <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
        <div className="h-2 w-full bg-gray-200 rounded-full" />
      </div>
      <div>
        <div className="h-3 w-20 bg-gray-200 rounded mb-1" />
        <div className="h-2 w-full bg-gray-200 rounded-full" />
      </div>
    </div>
  </div>
);

export const ServerStatsGrid: React.FC<ServerStatsGridProps> = ({
  servers,
  loading,
}) => {
  if (loading && servers.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {servers.map((server) => (
        <ServerCard
          key={server.id}
          name={server.name}
          status={server.status}
          cpuUsage={server.cpuUsage}
          ramUsage={server.ramUsage}
          icon={server.icon}
          uptime={server.uptime}
        />
      ))}
    </div>
  );
};
