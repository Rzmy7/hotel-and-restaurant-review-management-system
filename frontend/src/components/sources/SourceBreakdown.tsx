import React, { useState } from 'react';
import { ThumbsUp, Minus, ThumbsDown, BarChart3 } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SourceData {
    name: string;
    color: string;
    reviews: number;
    pct: number;           // share of total reviews
    positive: number;      // count
    neutral: number;
    negative: number;
}

// ─── Mock data (keyed per time-range matching InsightsPage) ─────────────────
const dataByRange: Record<string, SourceData[]> = {
    '7d': [
        { name: 'Booking.com', color: '#3b82f6', reviews: 18, pct: 38, positive: 12, neutral: 4, negative: 2 },
        { name: 'TripAdvisor', color: '#8b5cf6', reviews: 14, pct: 30, positive: 9, neutral: 3, negative: 2 },
        { name: 'Google', color: '#10b981', reviews: 10, pct: 21, positive: 7, neutral: 2, negative: 1 },
        { name: 'Expedia', color: '#f59e0b', reviews: 5, pct: 11, positive: 2, neutral: 2, negative: 1 },
    ],
    '30d': [
        { name: 'Booking.com', color: '#3b82f6', reviews: 79, pct: 42, positive: 52, neutral: 19, negative: 8 },
        { name: 'TripAdvisor', color: '#8b5cf6', reviews: 53, pct: 28, positive: 33, neutral: 13, negative: 7 },
        { name: 'Google', color: '#10b981', reviews: 38, pct: 20, positive: 27, neutral: 7, negative: 4 },
        { name: 'Expedia', color: '#f59e0b', reviews: 19, pct: 10, positive: 10, neutral: 6, negative: 3 },
    ],
    '90d': [
        { name: 'Booking.com', color: '#3b82f6', reviews: 228, pct: 42, positive: 148, neutral: 55, negative: 25 },
        { name: 'TripAdvisor', color: '#8b5cf6', reviews: 152, pct: 28, positive: 95, neutral: 38, negative: 19 },
        { name: 'Google', color: '#10b981', reviews: 108, pct: 20, positive: 75, neutral: 22, negative: 11 },
        { name: 'Expedia', color: '#f59e0b', reviews: 54, pct: 10, positive: 29, neutral: 16, negative: 9 },
    ],
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const pctOf = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

const MiniBar = ({
    positive, neutral, negative, total,
}: { positive: number; neutral: number; negative: number; total: number }) => (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
        <div style={{ width: `${pctOf(positive, total)}%`, backgroundColor: '#10b981' }} />
        <div style={{ width: `${pctOf(neutral, total)}%`, backgroundColor: '#94a3b8' }} />
        <div style={{ width: `${pctOf(negative, total)}%`, backgroundColor: '#f87171' }} />
    </div>
);

// ─── Component ──────────────────────────────────────────────────────────────
interface SourceBreakdownProps {
    timeRange?: string;
}

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'sentiment', label: 'Sentiment' },
] as const;

type TabId = typeof TABS[number]['id'];

const SourceBreakdown: React.FC<SourceBreakdownProps> = ({ timeRange = '30d' }) => {
    const [tab, setTab] = useState<TabId>('overview');
    const sources = dataByRange[timeRange] ?? dataByRange['30d'];
    const maxReviews = Math.max(...sources.map((s) => s.reviews));

    return (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 grid place-items-center bg-blue-50 dark:bg-blue-900/40 text-blue-500 dark:text-blue-400 rounded-lg border border-transparent dark:border-blue-800/60">
                        <BarChart3 size={16} />
                    </div>
                    <div>
                        <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Source Breakdown</h3>
                        <p className="m-0 text-[11px] text-gray-400 dark:text-slate-400">Per-source performance metrics</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-100 dark:bg-slate-700/50 rounded-lg p-0.5 gap-0.5 border border-transparent dark:border-slate-600/50">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-3 py-1 text-[13px] font-medium rounded-md transition-all cursor-pointer border-none
                ${tab === t.id
                                    ? 'bg-white text-gray-800 shadow-sm dark:bg-slate-600 dark:text-white dark:shadow-none'
                                    : 'bg-transparent text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-700/50">
                    {/* Column headers */}
                    <div className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 pb-2 mb-1">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Source</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Reviews</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Share</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-right">Volume</span>
                    </div>

                    {sources.map((s) => (
                        <div key={s.name} className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 items-center py-3">
                            {/* Source name */}
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                            </div>

                            {/* Review count */}
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{s.reviews}</span>

                            {/* Share % */}
                            <span
                                className="text-sm font-bold text-center"
                                style={{ color: s.color }}
                            >
                                {s.pct}%
                            </span>

                            {/* Mini volume bar */}
                            <div className="flex items-center gap-2 justify-end">
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[48px]">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${pctOf(s.reviews, maxReviews * 1.1)}%`,
                                            backgroundColor: s.color,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── SENTIMENT TAB ────────────────────────────────────────────────── */}
            {tab === 'sentiment' && (
                <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-700/50">
                    {/* Legend */}
                    <div className="flex items-center gap-4 pb-3 flex-wrap">
                        {[
                            { label: 'Positive', color: '#10b981', Icon: ThumbsUp },
                            { label: 'Neutral', color: '#94a3b8', Icon: Minus },
                            { label: 'Negative', color: '#f87171', Icon: ThumbsDown },
                        ].map(({ label, color, Icon }) => (
                            <div key={label} className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-slate-400">
                                <Icon size={12} style={{ color }} />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-[120px_1fr_56px_56px_56px] gap-x-3 py-2">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Source</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Breakdown</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center" style={{ color: '#10b981' }}>Pos</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Neu</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center" style={{ color: '#f87171' }}>Neg</span>
                    </div>

                    {sources.map((s) => {
                        const total = s.positive + s.neutral + s.negative;
                        const posPct = pctOf(s.positive, total);
                        const neuPct = pctOf(s.neutral, total);
                        const negPct = pctOf(s.negative, total);
                        return (
                            <div key={s.name} className="grid grid-cols-[120px_1fr_56px_56px_56px] gap-x-3 items-center py-3.5">
                                {/* Source name */}
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                                </div>

                                {/* Stacked bar */}
                                <div className="flex flex-col gap-1.5">
                                    <MiniBar positive={s.positive} neutral={s.neutral} negative={s.negative} total={total} />
                                    <span className="text-[10px] text-gray-400 dark:text-slate-500">{s.reviews} total reviews</span>
                                </div>

                                {/* Pos count + % */}
                                <div className="text-center">
                                    <div className="text-sm font-semibold" style={{ color: '#10b981' }}>{s.positive}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500">{posPct}%</div>
                                </div>

                                {/* Neu count + % */}
                                <div className="text-center">
                                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{s.neutral}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500">{neuPct}%</div>
                                </div>

                                {/* Neg count + % */}
                                <div className="text-center">
                                    <div className="text-sm font-semibold" style={{ color: '#f87171' }}>{s.negative}</div>
                                    <div className="text-[10px] text-gray-400 dark:text-slate-500">{negPct}%</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SourceBreakdown;
