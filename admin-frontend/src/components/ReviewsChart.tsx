import React from "react";
import type { ChartDataPoint } from "../types";

interface ReviewsChartProps {
  data: ChartDataPoint[];
}

const chartTheme = {
  bar: "bg-blue-600",
  chip: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  rank: "border-blue-100 bg-blue-100/80 text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

export const ReviewsChart: React.FC<ReviewsChartProps> = ({ data }) => {
  const sortedData = [...data]
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
  const totalReviews = sortedData.reduce((sum, item) => sum + item.value, 0);
  const maxValue =
    sortedData.length > 0
      ? Math.max(...sortedData.map((item) => item.value))
      : 1;

  if (sortedData.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700/80 dark:border-slate-700 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 p-6 shadow-sm flex flex-col h-full min-h-[350px] transition-colors duration-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/40 dark:bg-blue-500/10 blur-3xl" />
        <div className="relative flex-1 flex flex-col">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Reviews by Platform
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Total reviews collected from configured sources
            </p>
          </div>
          <div className="flex flex-1 min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 bg-white/70 dark:bg-slate-700/30 text-sm text-slate-400 dark:text-slate-500">
            No review data available.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700/80 dark:border-slate-700 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 p-6 shadow-sm flex flex-col h-full min-h-[350px] transition-colors duration-200">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/40 dark:bg-blue-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-6 flex-1">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Reviews by Platform
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Total reviews collected from configured sources
          </p>

          <div className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {sortedData.length} platforms tracked
          </div>
        </div>

        <div className="rounded-2xl border border-white/70 dark:border-slate-700 bg-white/70 dark:bg-slate-700/40 p-5 flex flex-col flex-1 justify-center">
          <div className="space-y-4">
            {sortedData.map((item, index) => {
              const share =
                totalReviews > 0 ? (item.value / totalReviews) * 100 : 0;

              return (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 dark:border-slate-600 bg-slate-50/85 dark:bg-slate-800/60 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <span
                        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-semibold ${chartTheme.rank}`}
                      >
                        {(index + 1).toString().padStart(2, "0")}
                      </span>

                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-800 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-xs uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mt-0.5">
                          {share.toFixed(0)}% share
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tabular-nums ${chartTheme.chip}`}
                    >
                      {item.value.toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-white dark:bg-slate-900/50 ring-1 ring-inset ring-slate-200/80 dark:ring-slate-600">
                    <div
                      className={`h-full rounded-full ${chartTheme.bar} transition-all`}
                      style={{ width: `${(item.value / maxValue) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
