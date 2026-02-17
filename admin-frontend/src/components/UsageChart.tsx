import React from 'react';
import type { ChartDataPoint } from '../types';

interface UsageChartProps {
    data: ChartDataPoint[];
}

export const UsageChart: React.FC<UsageChartProps> = ({ data }) => {
    const width = 600;
    const height = 250;
    const padding = 40;

    const maxVal = Math.max(...data.map(d => d.value));
    const yAxisValues = [0, 4500, 9000, 13500, 18000];

    const getPoints = () => {
        return data.map((d, i) => {
            const x = padding + (i * ((width - padding * 2) / (data.length - 1)));
            const y = height - padding - ((d.value / maxVal) * (height - padding * 2));
            return { x, y, value: d.value, label: d.label };
        });
    };

    const chartPoints = getPoints();

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900">Platform Usage Over Time</h3>
                <p className="text-sm text-gray-500">Active users per month</p>
            </div>
            <div className="flex-1 relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64" preserveAspectRatio="xMidYMid meet">
                    {/* Y Axis Labels */}
                    {yAxisValues.map((val, i) => {
                        const y = height - padding - ((val / maxVal) * (height - padding * 2));
                        return (
                            <text
                                key={i}
                                x={padding - 10}
                                y={y + 4}
                                textAnchor="end"
                                className="text-xs fill-gray-400"
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
                                stroke="#e5e7eb"
                                strokeWidth="1"
                            />
                        );
                    })}

                    {/* The Line */}
                    <polyline
                        points={chartPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Dots */}
                    {chartPoints.map((p, i) => (
                        <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="4"
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth="2"
                        />
                    ))}

                    {/* X Axis Labels */}
                    {chartPoints.map((p, i) => (
                        <text
                            key={i}
                            x={p.x}
                            y={height - 10}
                            textAnchor="middle"
                            className="text-xs fill-gray-400"
                        >
                            {p.label}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
};
