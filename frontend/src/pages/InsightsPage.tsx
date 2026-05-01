import React, { useState, useEffect } from 'react';
import {
    Star, MessageSquare, TrendingUp, Clock, ThumbsUp, ThumbsDown,
    Zap, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
    Minus, Lightbulb, Target, BarChart3, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import { fetchSubscriptionUsage } from '../services/subscriptionPlansService';
import { dashboardService } from '../services/dashboardService';
import { Button } from '../components/ui/Button';
import InsightsHeader from '../components/shared/InsightsHeader';
import SourceBreakdown from '../components/sources/SourceBreakdown';

interface RangeData {
    overallScore: number;
    overallScoreChange: string;
    totalReviews: string;
    totalReviewsChange: string;
    avgRating: string;
    avgRatingChange: string;
    responseRate: string;
    responseRateChange: string;
    sentimentMonths: string[];
    sentimentPositive: number[];
    sentimentNeutral: number[];
    sentimentNegative: number[];
    ratingDistribution: { rating: number; count: number; pct: number }[];
    categories: { name: string; score: number; prev: number }[];
    sources: { name: string; rating: number; reviews: number; pct: number; color: string }[];
    positiveKeywords: { word: string; count: number }[];
    negativeKeywords: { word: string; count: number }[];
    responseMetrics: { avgTime: string; rate: string; ratingImpact: string };
    heatmapWeeks: number[][];
    aiActions: { severity: 'critical' | 'warning' | 'info'; title: string; body: string }[];
}

// ═══════════════════════════════════════════════════════════════════
//  HELPER: Change badge
// ═══════════════════════════════════════════════════════════════════
const ChangeBadge = ({ value }: { value?: string }) => {
    if (!value) {
        return (
            <span className="text-gray-400 text-xs px-2 py-1">
                N/A
            </span>
        );
    }

    const num = parseFloat(value.replace('%', ''));

    const isUp = num > 0 || value.includes('+');
    const isNeutral = num === 0 || value === '0' || value === '0%';

    const colors = isNeutral
        ? 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-slate-700'
        : isUp
            ? 'text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/40'
            : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/40';

    const Icon = isNeutral ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

    return (
        <span className={`inline-flex items-center gap-0.5 text-[13px] font-semibold px-2 py-1 rounded-md ${colors}`}>
            <Icon size={13} />
            {value}
        </span>
    );
};


// ═══════════════════════════════════════════════════════════════════
//  HELPER: Heatmap cell color
// ═══════════════════════════════════════════════════════════════════
const heatColor = (v: number, max: number) => {
    if (v === 0) return 'bg-gray-100 dark:bg-slate-700';
    const ratio = v / (max || 1);
    if (ratio < 0.25) return 'bg-blue-100 dark:bg-blue-900/40';
    if (ratio < 0.5) return 'bg-blue-200 dark:bg-blue-800/50';
    if (ratio < 0.75) return 'bg-blue-400 dark:bg-blue-600/80';
    return 'bg-blue-600 dark:bg-blue-500';
};

// ═══════════════════════════════════════════════════════════════════
//  PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const InsightsPage: React.FC = () => {
    const [timeRange, setTimeRange] = useState('30d');
    const [insightData, setInsightData] = useState<RangeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const { user } = useAuth();
    const navigate = useNavigate();
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id;
    

    useEffect(() => {
        if (!user?.user_id) return;

        const checkAccess = async () => {
            setHasAccess(null);
            try {
                const usage = await fetchSubscriptionUsage(user.user_id);
                const hasInsights = usage.features.some(f => f.key === 'insights' && f.enabled);
                setHasAccess(hasInsights);
            } catch (err) {
                console.error('Error checking plan access', err);
                setHasAccess(false);
            }
        };

        checkAccess();
    }, [user?.user_id, organizationId]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/insights?range=${timeRange}`);

                const data = await res.json();

                console.log("INSIGHT DATA:", data); // 👈 ADD THIS

                setInsightData(data);

            } catch (err) {
                console.error("Error fetching insights:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange]);


    



    // ✅ 1. Loading
    if (loading || !insightData) {
        return <div>Loading insights...</div>;
    }

    // ✅ 2. Access checking
    if (hasAccess === null) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    // ✅ 3. No access
    if (hasAccess === false) {
        return (
            <div className="min-h-full bg-gray-50 dark:bg-slate-900">
                <InsightsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
                <div className="flex items-center justify-center h-[80vh]">
                    <p>Upgrade to access insights</p>
                </div>
            </div>
        );
    }

    // ✅ 4. SAFE AREA (ONLY HERE)
    const d = insightData;

    const total = d.ratingDistribution.reduce((sum, r) => sum + r.count, 0);

    const positive = d.ratingDistribution
    .filter((r) => r.rating >= 4)
    .reduce((sum, r) => sum + r.count, 0);

    const satisfactionRate =
    total > 0 ? Math.round((positive / total) * 100) : 0;

    const max = Math.max(
    ...(d.ratingDistribution.map(r => r.count) || [1])
    );

    // calculations
    const sentLen = d.sentimentMonths.length;
    const chartW = 600;
    const chartH = 180;
    const gapX = chartW / (sentLen - 1 || 1);

    const toY = (v: number) => chartH - (v / 100) * chartH;

    const linePoints = (vals: number[]) =>
        vals.map((v, i) => `${i * gapX},${toY(v)}`).join(' ');

    const areaPath = (vals: number[]) => {
        const pts = vals.map((v, i) => `${i * gapX},${toY(v)}`).join(' L');
        return `M0,${chartH} L${pts} L${(vals.length - 1) * gapX},${chartH} Z`;
    };

    const heatMax = Math.max(...d.heatmapWeeks.flat(), 1);

    const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };


    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            <InsightsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">

                {/* ═══ 1. KPI METRICS ROW ═══════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1000px]:grid-cols-4 gap-4">
                {[
                    {
                        icon: <Zap size={20} />,
                        label: 'Overall Score',
                        value: d.overallScore ?? "--",
                        change: d.overallScoreChange ?? "0%",
                        bg: 'bg-blue-50 dark:bg-blue-900/40',
                        fg: 'text-blue-500 dark:text-blue-400'
                    },
                    {
                        icon: <MessageSquare size={20} />,
                        label: 'Total Reviews',
                        value: d.totalReviews ?? "--",
                        change: d.totalReviewsChange ?? "0%",
                        bg: 'bg-violet-50 dark:bg-violet-900/40',
                        fg: 'text-violet-500 dark:text-violet-400'
                    },
                    {
                        icon: <Star size={20} />,
                        label: 'Avg Rating',
                        value: d.avgRating ?? "--",
                        change: d.avgRatingChange ?? "0%",
                        bg: 'bg-amber-50 dark:bg-amber-900/40',
                        fg: 'text-amber-500 dark:text-amber-400'
                    },
                    {
                        icon: <Clock size={20} />,
                        label: 'Response Rate',
                        value: d.responseRate ?? "--",
                        change: d.responseRateChange ?? "0%",
                        bg: 'bg-emerald-50 dark:bg-emerald-900/40',
                        fg: 'text-emerald-500 dark:text-emerald-400'
                    },
                ].map((m) => (
                        <div
                            key={m.label}
                            className="flex items-center gap-3.5 p-[18px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl cursor-pointer hover:scale-105 transition-all"
                        >
                            <div className={`w-11 h-11 grid place-items-center ${m.bg} ${m.fg} rounded-[10px]`}>{m.icon}</div>
                            <div className="flex-1">
                                <p className="mb-1.5 text-[13px] text-gray-500 dark:text-gray-400 font-medium m-0">{m.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[26px] font-bold text-gray-800 dark:text-white">{m.value}</span>
                                    <ChangeBadge value={m.change} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══ 2. SENTIMENT OVER TIME ════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Sentiment Over Time</h3>
                        <div className="flex gap-4">
                            {[
                                { label: 'Positive', color: 'bg-blue-500' },
                                { label: 'Neutral', color: 'bg-slate-300 dark:bg-slate-500' },
                                { label: 'Negative', color: 'bg-red-400' },
                            ].map((l) => (
                                <div key={l.label} className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-gray-400">
                                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                                    <span>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 h-[200px] bg-gradient-to-b from-blue-500/5 dark:from-blue-500/10 to-transparent rounded-lg">
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map((r) => (
                                <line key={r} x1="0" y1={chartH * r} x2={chartW} y2={chartH * r} className="stroke-gray-100 dark:stroke-slate-700" strokeWidth="1" />
                            ))}
                            {/* Positive area */}
                            <path d={areaPath(d.sentimentPositive || [])} fill="#3b82f6" opacity="0.12" />
                            {/* Positive line */}
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentPositive || [])} />
                            {/* Neutral line */}
                            <polyline fill="none" className="stroke-slate-300 dark:stroke-slate-500" strokeWidth="2" strokeDasharray="4,4" points={linePoints(d.sentimentNeutral || [])} />
                            {/* Negative line */}
                            <polyline fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentNegative || [])} />
                            {/* Positive dots */}
                            {(d.sentimentPositive || []).map((v, i) => (
                                <circle key={i} cx={i * gapX} cy={toY(v)} r="4" fill="#3b82f6" />
                            ))}
                        </svg>
                    </div>
                    <div className={`grid text-center text-xs text-gray-400 dark:text-slate-500 mt-2`} style={{ gridTemplateColumns: `repeat(${sentLen}, 1fr)` }}>
                        {d.sentimentMonths?.map((m) => <span key={m}>{m}</span>)}
                    </div>
                </div>

                {/* ═══ RATING DISTRIBUTION ═══ */}
                <div
                id="total-reviews-section"
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5"
                >
                <div id="rating-section">
                    <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white mb-5">
                    Rating Distribution
                    </h3>

                    {/* Bars */}
                    <div className="flex flex-col gap-3">
                    {d.ratingDistribution.map((r) => (
                        <div
                        key={r.rating}
                        className="grid grid-cols-[60px_1fr_70px] items-center gap-3"
                        >
                        {/* ⭐ Star */}
                        <div className="flex items-center gap-1">
                            <Star size={14} className="text-amber-400" fill="#fbbf24" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {r.rating}
                            </span>
                        </div>

                        {/* 🔴 Bar */}
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded h-2">
                            <div
                            className="bg-red-500 h-2 rounded transition-all duration-700 ease-in-out"
                            style={{
                                width: `${(r.count / max) * 100}%`,
                            }}
                            />
                        </div>

                        {/* 🔢 Count */}
                        <div className="text-right">
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {r.count}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">
                            ({r.pct}%)
                            </span>
                        </div>
                        </div>
                    ))}
                    </div>

                    {/* Satisfaction */}
                    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Satisfaction Rate
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {satisfactionRate}%
                    </span>
                    </div>
                </div>
                </div>

                {/* ═══ CATEGORY + SOURCE (SAME ROW) ═══ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">

                    {/* Category Performance */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <h3 className="mb-5 font-bold text-gray-800 dark:text-white">Category Performance</h3>

                    <div className="flex flex-col gap-3">
                    {d.categories.map((c) => (
                        <div
                        key={c.name}
                        className="grid grid-cols-[80px_1fr_70px] items-center gap-3"
                        >
                        {/* 📌 Category Name */}
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {c.name}
                        </span>

                        {/* 📊 Bar */}
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded h-2">
                            <div
                            className="h-2 rounded transition-all duration-700"
                            style={{
                                width: `${c.score}%`,
                                backgroundColor:
                                c.score >= 80
                                    ? "#3b82f6"   // Blue
                                    : c.score >= 60
                                    ? "#f59e0b"   // Orange
                                    : "#ef4444",  // Red
                            }}
                            />
                        </div>

                        {/* 🔢 Percentage */}
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-right">
                            {c.score}%
                        </span>
                        </div>
                    ))}
                    </div>
                    </div>

                    {/* Source Breakdown */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <SourceBreakdown timeRange={timeRange} />
                    </div>

                </div>

                {/* ═══ 6. TOP KEYWORDS ═══════════════════════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Positive keywords */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsUp size={16} className="text-emerald-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Top Positive Keywords</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(d.positiveKeywords || []).map((kw) => {
                                const maxCount = d.positiveKeywords[0]?.count || 1;
                                const ratio = kw.count / maxCount;
                                const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                return (
                                    <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium border border-emerald-100 dark:border-emerald-800/60 ${size}`}>
                                        {kw.word}
                                        <span className="text-emerald-500 dark:text-emerald-500 font-normal text-[11px]">{kw.count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Negative keywords */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsDown size={16} className="text-red-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Top Negative Keywords</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {(d.negativeKeywords || []).map((kw) => {
                                const maxCount = d.negativeKeywords[0]?.count || 1;
                                const ratio = kw.count / maxCount;
                                const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                return (
                                    <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg font-medium border border-red-100 dark:border-red-800/60 ${size}`}>
                                        {kw.word}
                                        <span className="text-red-500 dark:text-red-500 font-normal text-[11px]">{kw.count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ═══ 7. RESPONSE METRICS + 8. HEATMAP ══════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">

                    {/* Response Metrics */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white mb-5">Response Metrics</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Avg Response Time', value: d.responseMetrics?.avgTime || '24h', icon: <Clock size={18} />, color: 'bg-blue-50 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400' },
                                { label: 'Response Rate', value: d.responseMetrics?.rate || '0%', icon: <CheckCircle2 size={18} />, color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400' },
                                { label: 'Rating Impact', value: d.responseMetrics?.ratingImpact || '+0.0', icon: <TrendingUp size={18} />, color: 'bg-amber-50 text-amber-500 dark:bg-amber-900/40 dark:text-amber-400' },
                            ].map((m) => (
                                <div key={m.label} className="flex flex-col items-center text-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                                    <div className={`w-10 h-10 grid place-items-center rounded-xl ${m.color} mb-3`}>{m.icon}</div>
                                    <span className="text-2xl font-bold text-gray-800 dark:text-white">{m.value}</span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{m.label}</span>
                                </div>
                            ))}

                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700">
                            <p className="text-[13px] text-gray-500 dark:text-gray-400 m-0 leading-relaxed">
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Insight:</span> Faster response times generally correlate with improved follow-up ratings from guests.
                            </p>
                        </div>
                    </div>

                    {/* Review Volume Heatmap */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Review Volume</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                <span>Less</span>
                                <span className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-slate-700" />
                                <span className="w-3 h-3 rounded-sm bg-blue-100 dark:bg-blue-900/40" />
                                <span className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-800/50" />
                                <span className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-600/80" />
                                <span className="w-3 h-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
                                <span>More</span>
                            </div>
                        </div>
                        {/* Day labels */}
                        <div className="flex gap-1">
                            <div className="flex flex-col gap-1 shrink-0 mr-1">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                    <span key={i} className="text-[10px] text-gray-400 h-3.5 flex items-center justify-end w-4">{day}</span>
                                ))}
                            </div>
                            {/* Heatmap grid */}
                            <div className="flex gap-1 flex-1 overflow-x-auto">
                                {(d.heatmapWeeks || []).map((week, wi) => (
                                    <div key={wi} className="flex flex-col gap-1">
                                        {week.map((val, di) => (
                                            <div
                                                key={di}
                                                className={`w-3.5 h-3.5 rounded-sm transition-colors ${heatColor(val, heatMax)}`}
                                                title={`${val} reviews`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══ 9. AI RECOMMENDATIONS ═════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 grid place-items-center bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
                            <Lightbulb size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">AI Recommendations</h3>
                            <p className="m-0 text-[11px] text-gray-400 dark:text-gray-500">Dynamically generated based on live review analysis</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        {(d.aiActions || []).length > 0 ? d.aiActions.map((action, i) => {
                            const styles = {
                                critical: { border: 'border-red-200 dark:border-red-800/50', bg: 'bg-red-50 dark:bg-red-900/10', icon: <AlertTriangle size={16} />, iconColor: 'text-red-500', label: 'Critical', labelBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
                                warning: { border: 'border-amber-200 dark:border-amber-800/50', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: <Target size={16} />, iconColor: 'text-amber-500', label: 'Action', labelBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
                                info: { border: 'border-blue-200 dark:border-blue-800/50', bg: 'bg-blue-50 dark:bg-blue-900/10', icon: <BarChart3 size={16} />, iconColor: 'text-blue-500', label: 'Insight', labelBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
                            }[action.severity] || { border: 'border-blue-200 dark:border-blue-800/50', bg: 'bg-blue-50 dark:bg-blue-900/10', icon: <BarChart3 size={16} />, iconColor: 'text-blue-500', label: 'Insight', labelBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' };
                            return (
                                <div key={i} className={`flex items-start gap-3.5 p-4 rounded-xl border ${styles.border} ${styles.bg}`}>
                                    <div className={`w-8 h-8 grid place-items-center rounded-lg bg-white dark:bg-slate-800 shrink-0 ${styles.iconColor}`}>
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.labelBg}`}>
                                                {styles.label}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{action.title}</span>
                                        </div>
                                        <p className="text-[13px] text-gray-600 dark:text-gray-400 m-0 leading-relaxed">{action.body}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-sm text-gray-500 py-4 text-center">No AI insights generated at this time.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>

    );
};

export default InsightsPage;
