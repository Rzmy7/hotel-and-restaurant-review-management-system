import React from 'react';
import type { ChartDataPoint } from '../../../types/dashboard';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface TrendsChartProps {
    data: ChartDataPoint[];
}

export const TrendsChart: React.FC<TrendsChartProps> = ({ data }) => {
    // dimensions
    const width = 600;
    const height = 200;
    const padding = 10;

    // Safety check for empty data
    if (!data || data.length === 0) {
        return (
            <Card hoverEffect className="shadow-sm p-6 flex items-center justify-center h-[340px]">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No Trend Data Available</p>
            </Card>
        );
    }

    // Dynamic Scale Calculation
    const rawMaxVolume = Math.max(...data.map(d => d.volume), 10);
    // Round up to a nice number (e.g., nearest 100 or 1000)
    const maxVolume = Math.ceil(rawMaxVolume / 100) * 100;

    // For sentiment, we usually want 0-100, but let's make it data-driven if it helps visibility
    const rawMaxSentiment = Math.max(...data.map(d => d.sentiment), 1);
    const maxSentiment = rawMaxSentiment > 100 ? Math.ceil(rawMaxSentiment / 10) * 10 : 100;

    // Generate points for volume
    const volumePoints = data.map((point, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
        const y = height - (point.volume / maxVolume) * (height - padding * 2) - padding;
        return { x, y };
    });

    // Generate points for sentiment
    const sentimentPoints = data.map((point, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
        const y = height - (point.sentiment / maxSentiment) * (height - padding * 2) - padding;
        return { x, y };
    });

    // Create a smooth SVG path
    const getSmoothingPath = (pts: { x: number, y: number }[]) => {
        if (pts.length === 0) return "";
        if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y}`;

        let d = `M ${pts[0].x} ${pts[0].y}`;

        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = i > 0 ? pts[i - 1] : pts[i];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        return d;
    };

    const sentimentLine = getSmoothingPath(sentimentPoints);
    const sentimentArea = `${sentimentLine} L ${width} ${height} L 0 ${height} Z`;

    const volumeLine = getSmoothingPath(volumePoints);
    const volumeArea = `${volumeLine} L ${width} ${height} L 0 ${height} Z`;

    return (
        <Card hoverEffect className="shadow-sm p-6">
            <SectionHeader
                title="Review Trends"
                subtitle="Historical Analytics"
                className="mb-8"
            >
                <div className="flex gap-6 mt-1">
                    <div className="flex items-center gap-2 group cursor-help relative">
                        <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 group-hover:rotate-45 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-none">Volume</span>
                            <span className="text-[8px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase">Total</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 group cursor-help relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#4e80ee] ring-4 ring-blue-50 dark:ring-blue-900/30 group-hover:scale-125 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest leading-none">Sentiment Score</span>
                            <span className="text-[8px] font-bold text-gray-400 dark:text-slate-500 mt-1 uppercase">Rating</span>
                        </div>
                    </div>
                </div>
            </SectionHeader>

            <div className="relative h-[220px] mb-10 mt-4 px-10 group/chart">
                {/* Y-Axis Labels - Sentiment % (Left) */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-0 text-[10px] font-black text-[#4e80ee]/80 pr-2 items-end h-[200px]">
                    <span>{maxSentiment}%</span>
                    <span>{Math.round(maxSentiment * 0.75)}%</span>
                    <span>{Math.round(maxSentiment * 0.5)}%</span>
                    <span>{Math.round(maxSentiment * 0.25)}%</span>
                    <span className="translate-y-1">0%</span>
                </div>

                {/* Y-Axis Labels - Volume (Right) */}
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-0 text-[10px] font-black text-slate-400/80 pl-2 items-start h-[200px]">
                    <span>{maxVolume}</span>
                    <span>{Math.round(maxVolume * 0.75)}</span>
                    <span>{Math.round(maxVolume * 0.5)}</span>
                    <span>{Math.round(maxVolume * 0.25)}</span>
                    <span className="translate-y-1">0</span>
                </div>

                {/* X-Axis Labels - Time (Bottom) */}
                <div className="absolute bottom-[-32px] left-10 right-10 h-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.05em] flex justify-between">
                    {data.map((point, i) => (
                        <span key={i} className="hover:text-gray-500 cursor-default transition-colors">
                            {point.label}
                        </span>
                    ))}
                </div>

                <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-[200px] overflow-visible">
                    <defs>
                        <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4e80ee" stopOpacity="0.25" />
                            <stop offset="60%" stopColor="#4e80ee" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#4e80ee" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* horizontal Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                        <line
                            key={p}
                            x1="0"
                            y1={p * height}
                            x2={width}
                            y2={p * height}
                            className="stroke-slate-100 dark:stroke-slate-800"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Volume Area (Slate) */}
                    <path
                        d={volumeArea}
                        fill="url(#volumeGradient)"
                        className="transition-all duration-700 ease-in-out"
                    />
                    <path
                        d={volumeLine}
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Sentiment Area (Blue) */}
                    <path
                        d={sentimentArea}
                        fill="url(#sentimentGradient)"
                        className="transition-all duration-700 ease-in-out"
                    />
                    <path
                        d={sentimentLine}
                        fill="none"
                        stroke="#4e80ee"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-in-out"
                    />

                    {/* Markers for Sentiment */}
                    {sentimentPoints.map((p, i) => {
                        return (
                            <g key={i} className="cursor-pointer group/marker">
                                <circle cx={p.x} cy={p.y} r="12" fill="#4e80ee" fillOpacity="0.1" className="scale-0 group-hover/marker:scale-100 transition-transform duration-300" />
                                <circle cx={p.x} cy={p.y} r="8" fill="#4e80ee" fillOpacity="0.1" />
                                <circle
                                    cx={p.x} cy={p.y} r="5"
                                    fill="white" stroke="#4e80ee" strokeWidth="3"
                                    className="drop-shadow-sm transition-all duration-300 group-hover/marker:r-6"
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </Card>
    );
};

export default TrendsChart;
