import React from "react";
import { ActiveUsersCard } from "./ActiveUsersCard";
import { ReviewsCollectedCard } from "./ReviewsCollectedCard";
import { SystemUptimeCard } from "./SystemUptimeCard";
import type { DashboardStats } from "../types";

interface SecondaryStatsGridProps {
  stats: DashboardStats;
}

export const SecondaryStatsGrid: React.FC<SecondaryStatsGridProps> = ({
  stats,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ActiveUsersCard activeUsersToday={stats.activeUsersToday} />
      <ReviewsCollectedCard
        reviewsCollectedToday={stats.reviewsCollectedToday}
        reviewsGrowth={stats.reviewsGrowth}
      />
      <SystemUptimeCard systemUptime={stats.systemUptime} />
    </div>
  );
};
