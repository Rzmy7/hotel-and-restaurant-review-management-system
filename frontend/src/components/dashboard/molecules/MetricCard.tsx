import React from "react";
import { Card } from "../atoms/Card";
import { IconBox } from "../atoms/IconBox";
import { TrendBadge, type TrendType } from "../atoms/TrendBadge";
import type { MetricTrend } from "../../../types/dashboard";

export interface MetricCardProps extends Omit<
  MetricTrend,
  "changeType" | "colorScheme"
> {
  icon: React.ReactNode;
  label: string;
  changeType?: TrendType;
  colorScheme?: "blue" | "amber" | "indigo" | "rose" | "emerald";
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  change,
  changeType = "neutral",
  colorScheme = "blue",
}) => {
  return (
    <Card hoverEffect colorScheme={colorScheme}>
      <div className="flex justify-between items-center mb-3">
        <IconBox icon={icon} colorScheme={colorScheme} />
        {change && <TrendBadge type={changeType as TrendType} value={change} />}
      </div>

      <div className="space-y-0.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {value}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default MetricCard;
