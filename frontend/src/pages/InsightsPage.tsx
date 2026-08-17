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
import { apiClient } from '../api/client';
import { Button } from '../components/ui/Button';
import InsightsHeader from '../components/shared/InsightsHeader';
import InsightsSkeleton from './InsightsSkeleton';

// ─── Types ──────────────────────────────────────────────────────────────────
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
    positiveKeywords: { word: string; count: number }[];
    negativeKeywords: { word: string; count: number }[];
    responseMetrics: { avgTime: string; rate: string; ratingImpact: string };
    heatmapWeeks: number[][];
    aiActions: { severity: 'critical' | 'warning' | 'info'; title: string; body: string }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ChangeBadge = ({ value }: { value: string }) => {
    const num = parseFloat(value);
    const isUp = num > 0;
    const isNeutral = isNaN(num) || num === 0;
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

const heatColor = (v: number, max: number) => {
    if (v === 0) return 'bg-gray-100 dark:bg-slate-700';
    const ratio = v / max;
    if (ratio < 0.25) return 'bg-blue-100 dark:bg-blue-900/40';
    if (ratio < 0.5)  return 'bg-blue-200 dark:bg-blue-800/50';
    if (ratio < 0.75) return 'bg-blue-400 dark:bg-blue-600/80';
    return 'bg-blue-600 dark:bg-blue-500';
};

// ─── Empty / fallback state ──────────────────────────────────────────────────
const EMPTY_DATA: RangeData = {
    overallScore: 0,
    overallScoreChange: '0%',
    totalReviews: '0',
    totalReviewsChange: '0%',
    avgRating: '0',
    avgRatingChange: '0%',
    responseRate: '0%',
    responseRateChange: '0%',
    sentimentMonths: [],
    sentimentPositive: [],
    sentimentNeutral: [],
    sentimentNegative: [],
    positiveKeywords: [],
    negativeKeywords: [],
    responseMetrics: { avgTime: 'N/A', rate: '0%', ratingImpact: 'N/A' },
    heatmapWeeks: [[0, 0, 0, 0, 0, 0, 0]],
    aiActions: [],
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const InsightsPage: React.FC = () => {
    const [timeRange, setTimeRange] = useState('30d');
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [insightData, setInsightData] = useState<RangeData | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const { user } = useAuth();
    const navigate = useNavigate();
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id;

    // ── Subscription access check ────────────────────────────────────────────
    useEffect(() => {
        if (!user?.user_id) return;

        const checkAccess = async () => {
            setHasAccess(null);
            try {
                const usage = await fetchSubscriptionUsage(user.user_id);
                const insightsFeature = usage.features.find(f => f.key === 'insights');
                // Only block if the feature exists AND is explicitly disabled
                const allowed = !insightsFeature || insightsFeature.enabled;
                setHasAccess(allowed);
            } catch (err) {
                console.error('Error checking plan access', err);
                // Fail open: don't block if subscription check fails
                setHasAccess(true);
            }
        };

        checkAccess();
    }, [user?.user_id, organizationId]);

    // ── Data fetch ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!organizationId || hasAccess === false) return;

        const fetchData = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const data = await apiClient.get<RangeData>(
                    `/organizations/${organizationId}/insights`,
                    { timeRange }
                );
                setInsightData(data);
            } catch (err: any) {
                console.error('Error fetching insights:', err);
                setFetchError(err?.message || 'Failed to load insights.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [timeRange, organizationId, hasAccess]);

    // ── Data to render ───────────────────────────────────────────────────────
    const d: RangeData = insightData ?? EMPTY_DATA;

    // Sentiment chart geometry
    const sentLen = Math.max(d.sentimentMonths.length, 2);
    const chartW = 600;
    const chartH = 180;
    const gapX = chartW / (sentLen - 1);
    const toY = (v: number) => chartH - (v / 100) * chartH;
    const linePoints = (vals: number[]) =>
        vals.map((v, i) => `${i * gapX},${toY(v)}`).join(' ');
    const areaPath = (vals: number[]) => {
        if (vals.length === 0) return '';
        const pts = vals.map((v, i) => `${i * gapX},${toY(v)}`).join(' L');
        return `M0,${chartH} L${pts} L${(vals.length - 1) * gapX},${chartH} Z`;
    };

    const heatMax = Math.max(...d.heatmapWeeks.flat(), 1);

    // ── Guards ───────────────────────────────────────────────────────────────
    if (hasAccess === null || (loading && !insightData)) {
        return <InsightsSkeleton />;
    }

    if (hasAccess === false) {
        return (
            <div className="min-h-full bg-gray-50 dark:bg-slate-900">
                <InsightsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />
                <div className="flex-1 flex flex-col items-center justify-center p-8 mt-20">
                    <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-200 dark:border-slate-700 p-8 text-center">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={32} className="text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Upgrade to Premium</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                            Your current plan does not include access to AI-powered insights and advanced analytics.
                        </p>
                        <Button className="w-full" size="lg" onClick={() => navigate('/subscription')}>
                            View Upgrade Options
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900">
            <InsightsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">

                {/* Error Banner */}
                {fetchError && (
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
                        <AlertTriangle size={16} className="shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                )}

                {/* Loading overlay on refresh */}
                {loading && insightData && (
                    <div className="flex items-center gap-2 text-[13px] text-gray-400 dark:text-slate-500">
                        <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Refreshing data…
                    </div>
                )}

                {/* ═══ 1. KPI METRICS ROW ══════════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1000px]:grid-cols-4 gap-4">
                    {[
                        { icon: <Zap size={20} />, label: 'Overall Score', value: `${d.overallScore}`, change: d.overallScoreChange, bg: 'bg-blue-50 dark:bg-blue-900/40', fg: 'text-blue-500 dark:text-blue-400' },
                        { icon: <MessageSquare size={20} />, label: 'Total Reviews', value: d.totalReviews, change: d.totalReviewsChange, bg: 'bg-violet-50 dark:bg-violet-900/40', fg: 'text-violet-500 dark:text-violet-400' },
                        { icon: <Star size={20} />, label: 'Avg Rating', value: d.avgRating, change: d.avgRatingChange, bg: 'bg-amber-50 dark:bg-amber-900/40', fg: 'text-amber-500 dark:text-amber-400' },
                        { icon: <Clock size={20} />, label: 'Response Rate', value: d.responseRate, change: d.responseRateChange, bg: 'bg-emerald-50 dark:bg-emerald-900/40', fg: 'text-emerald-500 dark:text-emerald-400' },
                    ].map((m) => (
                        <div key={m.label} className="flex items-center gap-3.5 p-[18px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
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

                {/* ═══ 2. TREND SUMMARY ════════════════════════════════ */}
                {insightData && (
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 grid place-items-center bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400 rounded-lg">
                                <TrendingUp size={15} />
                            </div>
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Period Summary</h3>
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium ml-1">vs previous {timeRange}</span>
                        </div>
                        <div className="grid grid-cols-2 min-[700px]:grid-cols-4 gap-3">
                            {[
                                { label: 'Reviews', current: d.totalReviews, change: d.totalReviewsChange },
                                { label: 'Avg Rating', current: `${d.avgRating}★`, change: d.avgRatingChange },
                                { label: 'Overall Score', current: `${d.overallScore}/100`, change: d.overallScoreChange },
                                { label: 'Response Rate', current: d.responseRate, change: d.responseRateChange },
                            ].map(item => {
                                const num = parseFloat(item.change);
                                const isUp = num > 0;
                                const isNeutral = isNaN(num) || num === 0;
                                return (
                                    <div key={item.label} className="flex flex-col gap-1 p-3 bg-gray-50 dark:bg-slate-700/40 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">{item.label}</span>
                                        <span className="text-lg font-bold text-gray-800 dark:text-white">{item.current}</span>
                                        <span className={`text-[12px] font-semibold flex items-center gap-0.5 ${isNeutral ? 'text-gray-400' : isUp ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {isNeutral ? <Minus size={11} /> : isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                                            {item.change} vs prev
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══ 3. SENTIMENT OVER TIME ══════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Sentiment Over Time</h3>
                        <div className="flex gap-4">
                            {[
                                { label: 'Positive', color: 'bg-blue-500' },
                                { label: 'Neutral',  color: 'bg-slate-300 dark:bg-slate-500' },
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
                        {d.sentimentMonths.length < 2 ? (
                            <div className="h-full flex items-center justify-center text-gray-400 dark:text-slate-500 text-sm">
                                Not enough data for the selected period
                            </div>
                        ) : (
                            <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
                                {[0.25, 0.5, 0.75].map((r) => (
                                    <line key={r} x1="0" y1={chartH * r} x2={chartW} y2={chartH * r} className="stroke-gray-100 dark:stroke-slate-700" strokeWidth="1" />
                                ))}
                                <path d={areaPath(d.sentimentPositive)} fill="#3b82f6" opacity="0.12" />
                                <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentPositive)} />
                                <polyline fill="none" className="stroke-slate-300 dark:stroke-slate-500" strokeWidth="2" strokeDasharray="4,4" points={linePoints(d.sentimentNeutral)} />
                                <polyline fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentNegative)} />
                                {d.sentimentPositive.map((v, i) => (
                                    <circle key={i} cx={i * gapX} cy={toY(v)} r="4" fill="#3b82f6" />
                                ))}
                            </svg>
                        )}
                    </div>
                    {d.sentimentMonths.length >= 2 && (
                        <div className="grid text-center text-xs text-gray-400 dark:text-slate-500 mt-2" style={{ gridTemplateColumns: `repeat(${d.sentimentMonths.length}, 1fr)` }}>
                            {d.sentimentMonths.map((m) => <span key={m}>{m}</span>)}
                        </div>
                    )}
                </div>

                {/* ═══ 4. TOP KEYWORDS (word cloud style) ══════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Positive */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsUp size={16} className="text-emerald-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Top Positive Keywords</h3>
                        </div>
                        {d.positiveKeywords.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500">No keyword data yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {d.positiveKeywords.map((kw) => {
                                    const maxCount = d.positiveKeywords[0].count;
                                    const ratio = kw.count / maxCount;
                                    const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                    return (
                                        <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium border border-emerald-100 dark:border-emerald-800/60 ${size}`}>
                                            {kw.word}
                                            <span className="text-emerald-500 font-normal text-[11px]">{kw.count}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Negative */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsDown size={16} className="text-red-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">Top Negative Keywords</h3>
                        </div>
                        {d.negativeKeywords.length === 0 ? (
                            <p className="text-sm text-gray-400 dark:text-slate-500">No keyword data yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {d.negativeKeywords.map((kw) => {
                                    const maxCount = d.negativeKeywords[0].count;
                                    const ratio = kw.count / maxCount;
                                    const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                    return (
                                        <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg font-medium border border-red-100 dark:border-red-800/60 ${size}`}>
                                            {kw.word}
                                            <span className="text-red-500 font-normal text-[11px]">{kw.count}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ 5. RESPONSE METRICS + HEATMAP ══════════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">

                    {/* Response Metrics */}
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                        <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white mb-5">Response Metrics</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Avg Response Time', value: d.responseMetrics.avgTime, icon: <Clock size={18} />, color: 'bg-blue-50 text-blue-500 dark:bg-blue-900/40 dark:text-blue-400' },
                                { label: 'Response Rate',     value: d.responseMetrics.rate,    icon: <CheckCircle2 size={18} />, color: 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/40 dark:text-emerald-400' },
                                { label: 'Rating Impact',     value: d.responseMetrics.ratingImpact, icon: <TrendingUp size={18} />, color: 'bg-amber-50 text-amber-500 dark:bg-amber-900/40 dark:text-amber-400' },
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
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Insight:</span> Responding within 2 hours correlates with a
                                <span className="font-semibold text-blue-600 dark:text-blue-400"> {d.responseMetrics.ratingImpact}</span> star improvement in follow-up ratings.
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
                        <div className="flex gap-1">
                            <div className="flex flex-col gap-1 shrink-0 mr-1">
                                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                                    <span key={i} className="text-[10px] text-gray-400 h-3.5 flex items-center justify-end w-4">{day}</span>
                                ))}
                            </div>
                            <div className="flex gap-1 flex-1 overflow-x-auto">
                                {d.heatmapWeeks.map((week, wi) => (
                                    <div key={wi} className="flex flex-col gap-1">
                                        {week.map((val, di) => (
                                            <div
                                                key={di}
                                                className={`w-3.5 h-3.5 rounded-sm transition-colors ${heatColor(val, heatMax)}`}
                                                title={`${val} review${val !== 1 ? 's' : ''}`}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-[13px] text-gray-500 dark:text-gray-400">Peak day</span>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {(() => {
                                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                    const totals = days.map((_, di) =>
                                        d.heatmapWeeks.reduce((sum, week) => sum + (week[di] || 0), 0)
                                    );
                                    const peakIdx = totals.indexOf(Math.max(...totals));
                                    const avg = d.heatmapWeeks.length > 0
                                        ? Math.round(totals[peakIdx] / d.heatmapWeeks.length)
                                        : 0;
                                    return `${days[peakIdx]} — avg ${avg} reviews`;
                                })()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══ 6. AI RECOMMENDATIONS ═══════════════════════════ */}
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 grid place-items-center bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
                            <Lightbulb size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="m-0 text-base font-bold text-gray-800 dark:text-white">AI Recommendations</h3>
                            <p className="m-0 text-[11px] text-gray-400 dark:text-gray-500">Actionable insights based on review analysis</p>
                        </div>
                    </div>
                    {d.aiActions.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-slate-500">No AI recommendations generated for this period.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {d.aiActions.map((action, i) => {
                                const styles = {
                                    critical: { border: 'border-red-200 dark:border-red-800/50',   bg: 'bg-red-50 dark:bg-red-900/10',   icon: <AlertTriangle size={16} />, iconColor: 'text-red-500',   label: 'Critical', labelBg: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' },
                                    warning:  { border: 'border-amber-200 dark:border-amber-800/50', bg: 'bg-amber-50 dark:bg-amber-900/10', icon: <Target size={16} />,        iconColor: 'text-amber-500', label: 'Action',   labelBg: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' },
                                    info:     { border: 'border-blue-200 dark:border-blue-800/50',  bg: 'bg-blue-50 dark:bg-blue-900/10',  icon: <BarChart3 size={16} />,     iconColor: 'text-blue-500',  label: 'Insight',  labelBg: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' },
                                }[action.severity];
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
                            })}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default InsightsPage;
