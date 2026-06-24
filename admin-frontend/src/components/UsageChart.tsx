import React from 'react';
import { BarChart3 } from 'lucide-react';
import type { ChartDataPoint } from '../types';

interface UsageChartProps {
    data: ChartDataPoint[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
    const width = 600;
    const height = 250;
    const padding = 40;

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full min-h-[350px] transition-colors duration-200">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <BarChart3 size={18} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Review Volume Over Time</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Reviews processed per month</p>
                    </div>
                </div>
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-700/30 text-sm text-gray-400 dark:text-slate-500">
                    No usage data available.
                </div>
            </div>
        );
    }

    const maxVal = Math.max(...data.map((d) => d.value), 1);
    const ySteps = 5;
    const yAxisValues = Array.from({ length: ySteps }, (_, i) =>
        Math.round((maxVal / (ySteps - 1)) * i)
    );

    const getPoints = () => {
        return data.map((d, i) => {
            const x = padding + (i * ((width - padding * 2) / Math.max(data.length - 1, 1)));
            const y = height - padding - ((d.value / maxVal) * (height - padding * 2));
            return { x, y, value: d.value, label: d.label };
        });
    };

    const chartPoints = getPoints();

    // Build smooth area path
    const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L ${chartPoints[chartPoints.length - 1].x},${height - padding} L ${chartPoints[0].x},${height - padding} Z`;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-full min-h-[350px] group hover:shadow-md hover:border-gray-200 dark:border-slate-700 dark:hover:border-slate-600 transition-all duration-200">
            <div className="flex items-center gap-2.5 mb-4">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <BarChart3 size={18} className="text-blue-500 dark:text-blue-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Review Volume Over Time</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Reviews processed per month</p>
                </div>
            </div>
            <div className="flex-1 relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64" preserveAspectRatio="xMidYMid meet">
                    {/* Gradient fill */}
                    <defs>
                        <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
                        </linearGradient>
                    </defs>

                    {/* Y Axis Labels */}
                    {yAxisValues.map((val, i) => {
                        const y = height - padding - ((val / maxVal) * (height - padding * 2));
                        return (
                            <text
                                key={i}
                                x={padding - 10}
                                y={y + 4}
                                textAnchor="end"
                                className="text-xs fill-gray-400 dark:fill-slate-500"
                            >
                                {val.toLocaleString()}
                            </text>
                        );
                    })}

                    {/* Horizontal Grid Lines */}
                    {yAxisValues.map((val, i) => {
                        const y = height - padding - ((val / maxVal) * (height - padding * 2));
                        return (
                            <line
                                key={i}
                                x1={padding}
                                y1={y}
                                x2={width - padding}
                                y2={y}
                                className="stroke-gray-100 dark:stroke-slate-700"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* Area fill */}
                    <path d={areaPath} fill="url(#usageGradient)" />

                    {/* The Line */}
                    <polyline
                        points={chartPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots */}
                    {chartPoints.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r="5" fill="#3b82f6" opacity="0.15" />
                            <circle cx={p.x} cy={p.y} r="3" className="fill-white dark:fill-slate-800" stroke="#3b82f6" strokeWidth="2" />
                        </g>
                    ))}

                    {/* X Axis Labels */}
                    {chartPoints.map((p, i) => (
                        <text
                            key={i}
                            x={p.x}
                            y={height - 10}
                            textAnchor="middle"
                            className="text-xs fill-gray-400 dark:fill-slate-500"
                        >
                            {p.label}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
};
