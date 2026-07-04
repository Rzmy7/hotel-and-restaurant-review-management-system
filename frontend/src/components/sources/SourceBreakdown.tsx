import React, { useState } from 'react';
import { ThumbsUp, Minus, ThumbsDown, BarChart3 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SourceData {
    name: string;
    color: string;
    reviews: number;
    pct: number;       // share of total reviews (%)
    rating: number;    // average rating (optional display)
    positive: number;  // % positive sentiment
    neutral: number;   // % neutral sentiment
    negative: number;  // % negative sentiment
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MiniBar = ({
    positive, neutral, negative,
}: { positive: number; neutral: number; negative: number }) => (
    <div className="flex h-2 rounded-full overflow-hidden w-full">
        <div style={{ width: `${positive}%`, backgroundColor: '#10b981' }} />
        <div style={{ width: `${neutral}%`,  backgroundColor: '#94a3b8' }} />
        <div style={{ width: `${negative}%`, backgroundColor: '#f87171' }} />
    </div>
);

// ─── Component ───────────────────────────────────────────────────────────────
interface SourceBreakdownProps {
    sources?: SourceData[];
}

const TABS = [
    { id: 'overview',  label: 'Overview'  },
    { id: 'sentiment', label: 'Sentiment' },
] as const;

type TabId = typeof TABS[number]['id'];

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#db2777', '#ea580c', '#64748b'];

const SourceBreakdown: React.FC<SourceBreakdownProps> = ({ sources = [] }) => {
    const [tab, setTab] = useState<TabId>('overview');

    // Assign colors if not provided from API
    const coloredSources: SourceData[] = sources.map((s, i) => ({
        ...s,
        color: s.color || COLORS[i % COLORS.length],
    }));

    const maxReviews = Math.max(...coloredSources.map((s) => s.reviews), 1);

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

            {/* Empty state */}
            {coloredSources.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">
                    No source data available for this period.
                </p>
            )}

            {/* ── OVERVIEW TAB ──────────────────────────────────────────────── */}
            {tab === 'overview' && coloredSources.length > 0 && (
                <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-700/50">
                    <div className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 pb-2 mb-1">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Source</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Reviews</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Share</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-right">Volume</span>
                    </div>

                    {coloredSources.map((s) => (
                        <div key={s.name} className="grid grid-cols-[1fr_60px_60px_80px] gap-x-4 items-center py-3">
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{s.name}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">{s.reviews}</span>
                            <span className="text-sm font-bold text-center" style={{ color: s.color }}>{s.pct}%</span>
                            <div className="flex items-center gap-2 justify-end">
                                <div className="flex-1 h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden min-w-[48px]">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.round((s.reviews / maxReviews) * 100)}%`,
                                            backgroundColor: s.color,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── SENTIMENT TAB ─────────────────────────────────────────────── */}
            {tab === 'sentiment' && coloredSources.length > 0 && (
                <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-slate-700/50">
                    {/* Legend */}
                    <div className="flex items-center gap-4 pb-3 flex-wrap">
                        {[
                            { label: 'Positive', color: '#10b981', Icon: ThumbsUp },
                            { label: 'Neutral',  color: '#94a3b8', Icon: Minus    },
                            { label: 'Negative', color: '#f87171', Icon: ThumbsDown },
                        ].map(({ label, color, Icon }) => (
                            <div key={label} className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-slate-400">
                                <Icon size={12} style={{ color }} />
                                <span>{label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-[120px_1fr_56px_56px_56px] gap-x-3 py-2">
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Source</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">Breakdown</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center" style={{ color: '#10b981' }}>Pos</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center">Neu</span>
                        <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide text-center" style={{ color: '#f87171' }}>Neg</span>
                    </div>

                    {coloredSources.map((s) => (
                        <div key={s.name} className="grid grid-cols-[120px_1fr_56px_56px_56px] gap-x-3 items-center py-3.5">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{s.name}</span>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <MiniBar positive={s.positive} neutral={s.neutral} negative={s.negative} />
                                <span className="text-[10px] text-gray-400 dark:text-slate-500">{s.reviews} total reviews</span>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-semibold" style={{ color: '#10b981' }}>{s.positive}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">{s.neutral}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-sm font-semibold" style={{ color: '#f87171' }}>{s.negative}%</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SourceBreakdown;
