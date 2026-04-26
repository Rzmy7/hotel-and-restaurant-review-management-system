import React from "react";
import { UsageChart } from "./UsageChart";
import { ReviewsChart } from "./ReviewsChart";
import { QuickActions } from "./QuickActions";
import type { ChartDataPoint } from "../types";

interface ChartsAndActionsProps {
  usageData: ChartDataPoint[];
  reviewData: ChartDataPoint[];
}

export const ChartsAndActions: React.FC<ChartsAndActionsProps> = ({
  usageData,
  reviewData,
}) => {
  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UsageChart data={usageData} />
        <ReviewsChart data={reviewData} />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div>
  );
};
