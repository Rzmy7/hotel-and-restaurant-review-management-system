import React from 'react';
import type { ChartDataPoint } from '../types';

interface ReviewsChartProps {
    data: ChartDataPoint[];
}

const BAR_THEMES = [
    {
        bar: 'from-blue-600 via-blue-500 to-cyan-400',
        chip: 'border-blue-100 bg-blue-50 text-blue-700',
        rank: 'border-blue-100 bg-blue-100/80 text-blue-700',
    },
    {
        bar: 'from-indigo-600 via-violet-500 to-sky-400',
        chip: 'border-indigo-100 bg-indigo-50 text-indigo-700',
        rank: 'border-indigo-100 bg-indigo-100/80 text-indigo-700',
    },
    {
        bar: 'from-emerald-600 via-teal-500 to-cyan-400',
        chip: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        rank: 'border-emerald-100 bg-emerald-100/80 text-emerald-700',
    },
    {
        bar: 'from-amber-500 via-orange-500 to-rose-400',
        chip: 'border-amber-100 bg-amber-50 text-amber-700',
        rank: 'border-amber-100 bg-amber-100/80 text-amber-700',
    },
];

const getScaleConfig = (value: number): { max: number; ticks: number[] } => {
    if (value <= 0) {
        return { max: 4, ticks: [0, 1, 2, 3, 4] };
    }

    const safeValue = Math.max(value, 4);
    const roughStep = safeValue / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const normalized = roughStep / magnitude;

    let niceStep = magnitude;
    if (normalized > 5) {
        niceStep = 10 * magnitude;
    } else if (normalized > 2) {
        niceStep = 5 * magnitude;
    } else if (normalized > 1) {
        niceStep = 2 * magnitude;
    }

    const max = Math.ceil(safeValue / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let tick = 0; tick <= max; tick += niceStep) {
        ticks.push(tick);
    }

    return { max, ticks };
};

export const ReviewsChart: React.FC<ReviewsChartProps> = ({ data }) => {
    const sortedData = [...data].sort((left, right) => right.value - left.value).slice(0, 8);
    const totalReviews = sortedData.reduce((sum, item) => sum + item.value, 0);
    const maxValue = sortedData.length > 0 ? Math.max(...sortedData.map((item) => item.value)) : 0;

    const { max: scaleMax, ticks: axisTicks } = getScaleConfig(maxValue);
    const axisStyle = { gridTemplateColumns: `repeat(${axisTicks.length}, minmax(0, 1fr))` };

    if (sortedData.length === 0) {
        return (
            <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 shadow-sm">
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/40 blur-3xl" />
                <div className="relative">
                    <div className="mb-5">
                        <h3 className="text-base font-semibold text-slate-900">Reviews by Platform</h3>
                        <p className="mt-1 text-sm text-slate-500">Total reviews collected from configured sources</p>
                    </div>
                    <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 text-sm text-slate-400">
                        No review data available.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/60 p-6 shadow-sm">
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-blue-200/40 blur-3xl" />

            <div className="relative flex flex-col gap-5">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Reviews by Platform</h3>
                    <p className="mt-1 text-sm text-slate-500">Total reviews collected from configured sources</p>

                    <div className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
                        {sortedData.length} platforms tracked
                    </div>
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/70 p-4">
                    <div className="space-y-3">
                        {sortedData.map((item, index) => {
                            const theme = BAR_THEMES[index % BAR_THEMES.length];
                            const share = totalReviews > 0 ? (item.value / totalReviews) * 100 : 0;

                            return (
                                <div
                                    key={item.label}
                                    className="rounded-xl border border-slate-100 bg-slate-50/85 px-3 py-3"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span
                                                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border text-xs font-semibold ${theme.rank}`}
                                            >
                                                {(index + 1).toString().padStart(2, '0')}
                                            </span>

                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-slate-800">{item.label}</div>
                                                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                                                    {share.toFixed(0)}% share
                                                </div>
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${theme.chip}`}
                                        >
                                            {item.value.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-slate-200/80">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all`}
                                            style={{ width: `${(item.value / scaleMax) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 px-1">
                        <div className="grid text-[11px] font-medium text-slate-400" style={axisStyle}>
                            {axisTicks.map((value, index) => (
                                <span
                                    key={`${value}-${index}`}
                                    className={
                                        index === 0
                                            ? 'text-left'
                                            : index === axisTicks.length - 1
                                                ? 'text-right'
                                                : 'text-center'
                                    }
                                >
                                    {value.toLocaleString()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
