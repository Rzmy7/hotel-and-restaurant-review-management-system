import React, { useState } from 'react';
import {
    Star, MessageSquare, TrendingUp, Clock, ThumbsUp, ThumbsDown,
    Zap, AlertTriangle, CheckCircle2, ArrowUpRight, ArrowDownRight,
    Minus, Lightbulb, Target, BarChart3
} from 'lucide-react';
import InsightsHeader from '../components/InsightsHeader';
import SourceBreakdown from '../components/SourceBreakdown';

// ═══════════════════════════════════════════════════════════════════
//  MOCK DATA (keyed per time-range)
// ═══════════════════════════════════════════════════════════════════

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
    ratingDistribution: { stars: number; count: number; pct: number }[];
    categories: { name: string; score: number; prev: number }[];
    sources: { name: string; rating: number; reviews: number; pct: number; color: string }[];
    positiveKeywords: { word: string; count: number }[];
    negativeKeywords: { word: string; count: number }[];
    responseMetrics: { avgTime: string; rate: string; ratingImpact: string };
    heatmapWeeks: number[][];
    aiActions: { severity: 'critical' | 'warning' | 'info'; title: string; body: string }[];
}

const dataByRange: Record<string, RangeData> = {
    '7d': {
        overallScore: 82,
        overallScoreChange: '+3',
        totalReviews: '47',
        totalReviewsChange: '+8',
        avgRating: '4.2',
        avgRatingChange: '+0.1',
        responseRate: '94%',
        responseRateChange: '+2%',
        sentimentMonths: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        sentimentPositive: [65, 70, 68, 72, 75, 80, 78],
        sentimentNeutral: [20, 18, 19, 17, 15, 12, 14],
        sentimentNegative: [15, 12, 13, 11, 10, 8, 8],
        ratingDistribution: [
            { stars: 5, count: 19, pct: 40 },
            { stars: 4, count: 14, pct: 30 },
            { stars: 3, count: 8, pct: 17 },
            { stars: 2, count: 4, pct: 9 },
            { stars: 1, count: 2, pct: 4 },
        ],
        categories: [
            { name: 'Staff', score: 88, prev: 85 },
            { name: 'Cleanliness', score: 80, prev: 78 },
            { name: 'Location', score: 93, prev: 93 },
            { name: 'Value', score: 74, prev: 72 },
            { name: 'Food', score: 71, prev: 73 },
            { name: 'Amenities', score: 82, prev: 80 },
        ],
        sources: [
            { name: 'Booking.com', rating: 4.3, reviews: 18, pct: 38, color: '#3b82f6' },
            { name: 'TripAdvisor', rating: 4.1, reviews: 14, pct: 30, color: '#8b5cf6' },
            { name: 'Google', rating: 4.4, reviews: 10, pct: 21, color: '#10b981' },
            { name: 'Expedia', rating: 3.9, reviews: 5, pct: 11, color: '#f59e0b' },
        ],
        positiveKeywords: [
            { word: 'Friendly staff', count: 18 },
            { word: 'Great location', count: 15 },
            { word: 'Clean rooms', count: 13 },
            { word: 'Delicious breakfast', count: 11 },
            { word: 'Comfortable beds', count: 9 },
            { word: 'Beautiful view', count: 8 },
        ],
        negativeKeywords: [
            { word: 'Slow Wi-Fi', count: 12 },
            { word: 'Noisy rooms', count: 8 },
            { word: 'Small bathroom', count: 6 },
            { word: 'Expensive parking', count: 5 },
            { word: 'Limited menu', count: 4 },
        ],
        responseMetrics: { avgTime: '1.8h', rate: '94%', ratingImpact: '+0.3' },
        heatmapWeeks: [
            [2, 4, 1, 3, 5, 8, 6],
        ],
        aiActions: [
            { severity: 'critical', title: 'Wi-Fi complaints surging', body: '34% of negative reviews this week mention slow Wi-Fi. Upgrade network infrastructure in floors 3-5.' },
            { severity: 'warning', title: 'Food rating declining', body: 'Restaurant rating dropped from 73% to 71%. Consider rotating menu items and improving breakfast variety.' },
            { severity: 'info', title: 'Staff performance excels', body: 'Staff mentions are up 12% with 92% positive sentiment. Consider employee recognition program.' },
        ],
    },
    '30d': {
        overallScore: 79,
        overallScoreChange: '+5',
        totalReviews: '189',
        totalReviewsChange: '+23',
        avgRating: '4.3',
        avgRatingChange: '+0.2',
        responseRate: '91%',
        responseRateChange: '+4%',
        sentimentMonths: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        sentimentPositive: [62, 67, 70, 74],
        sentimentNeutral: [22, 20, 18, 16],
        sentimentNegative: [16, 13, 12, 10],
        ratingDistribution: [
            { stars: 5, count: 72, pct: 38 },
            { stars: 4, count: 55, pct: 29 },
            { stars: 3, count: 34, pct: 18 },
            { stars: 2, count: 18, pct: 10 },
            { stars: 1, count: 10, pct: 5 },
        ],
        categories: [
            { name: 'Staff', score: 85, prev: 80 },
            { name: 'Cleanliness', score: 78, prev: 75 },
            { name: 'Location', score: 92, prev: 92 },
            { name: 'Value', score: 72, prev: 68 },
            { name: 'Food', score: 69, prev: 71 },
            { name: 'Amenities', score: 80, prev: 77 },
        ],
        sources: [
            { name: 'Booking.com', rating: 4.4, reviews: 79, pct: 42, color: '#3b82f6' },
            { name: 'TripAdvisor', rating: 4.2, reviews: 53, pct: 28, color: '#8b5cf6' },
            { name: 'Google', rating: 4.5, reviews: 38, pct: 20, color: '#10b981' },
            { name: 'Expedia', rating: 4.0, reviews: 19, pct: 10, color: '#f59e0b' },
        ],
        positiveKeywords: [
            { word: 'Friendly staff', count: 64 },
            { word: 'Great location', count: 52 },
            { word: 'Clean rooms', count: 47 },
            { word: 'Delicious breakfast', count: 38 },
            { word: 'Comfortable beds', count: 31 },
            { word: 'Beautiful view', count: 28 },
            { word: 'Helpful concierge', count: 22 },
            { word: 'Spacious suite', count: 18 },
        ],
        negativeKeywords: [
            { word: 'Slow Wi-Fi', count: 41 },
            { word: 'Noisy rooms', count: 29 },
            { word: 'Small bathroom', count: 22 },
            { word: 'Expensive parking', count: 18 },
            { word: 'Limited menu', count: 14 },
            { word: 'Old furniture', count: 11 },
        ],
        responseMetrics: { avgTime: '2.4h', rate: '91%', ratingImpact: '+0.4' },
        heatmapWeeks: [
            [3, 5, 2, 4, 6, 9, 7],
            [4, 3, 5, 6, 7, 8, 5],
            [2, 6, 4, 5, 8, 10, 6],
            [5, 4, 3, 7, 6, 9, 8],
        ],
        aiActions: [
            { severity: 'critical', title: 'Wi-Fi is #1 complaint', body: '34% of negative reviews mention slow Wi-Fi. Upgrade network infrastructure — estimated 0.3-star rating impact.' },
            { severity: 'critical', title: 'Noise complaints escalating', body: 'Room noise mentions increased 40% month-over-month. Investigate soundproofing in east-wing rooms (201-215).' },
            { severity: 'warning', title: 'Food quality declining', body: 'Restaurant category dropped from 71% to 69%. Breakfast variety is the top complaint — consider menu refresh.' },
            { severity: 'warning', title: 'Bathroom size repeatedly cited', body: '22 reviews mention small bathrooms. Consider renovating compact rooms or adding storage solutions.' },
            { severity: 'info', title: 'Staff excellence recognized', body: 'Staff score rose 5 points to 85%. Top-mentioned employees: Maria (front desk), James (concierge).' },
            { severity: 'info', title: 'Google rating climbing', body: 'Google Reviews average increased to 4.5 — your highest-rated platform. Consider directing more guests to review on Google.' },
        ],
    },
    '90d': {
        overallScore: 76,
        overallScoreChange: '+8',
        totalReviews: '542',
        totalReviewsChange: '+67',
        avgRating: '4.1',
        avgRatingChange: '+0.3',
        responseRate: '87%',
        responseRateChange: '+9%',
        sentimentMonths: ['Dec', 'Jan', 'Feb'],
        sentimentPositive: [58, 65, 72],
        sentimentNeutral: [24, 20, 17],
        sentimentNegative: [18, 15, 11],
        ratingDistribution: [
            { stars: 5, count: 195, pct: 36 },
            { stars: 4, count: 163, pct: 30 },
            { stars: 3, count: 98, pct: 18 },
            { stars: 2, count: 54, pct: 10 },
            { stars: 1, count: 32, pct: 6 },
        ],
        categories: [
            { name: 'Staff', score: 83, prev: 76 },
            { name: 'Cleanliness', score: 76, prev: 70 },
            { name: 'Location', score: 91, prev: 90 },
            { name: 'Value', score: 70, prev: 64 },
            { name: 'Food', score: 67, prev: 65 },
            { name: 'Amenities', score: 78, prev: 73 },
        ],
        sources: [
            { name: 'Booking.com', rating: 4.2, reviews: 228, pct: 42, color: '#3b82f6' },
            { name: 'TripAdvisor', rating: 4.0, reviews: 152, pct: 28, color: '#8b5cf6' },
            { name: 'Google', rating: 4.3, reviews: 108, pct: 20, color: '#10b981' },
            { name: 'Expedia', rating: 3.8, reviews: 54, pct: 10, color: '#f59e0b' },
        ],
        positiveKeywords: [
            { word: 'Friendly staff', count: 187 },
            { word: 'Great location', count: 149 },
            { word: 'Clean rooms', count: 132 },
            { word: 'Delicious breakfast', count: 98 },
            { word: 'Comfortable beds', count: 85 },
            { word: 'Beautiful view', count: 72 },
            { word: 'Helpful concierge', count: 61 },
            { word: 'Spacious suite', count: 48 },
        ],
        negativeKeywords: [
            { word: 'Slow Wi-Fi', count: 118 },
            { word: 'Noisy rooms', count: 82 },
            { word: 'Small bathroom', count: 63 },
            { word: 'Expensive parking', count: 51 },
            { word: 'Limited menu', count: 39 },
            { word: 'Old furniture', count: 32 },
        ],
        responseMetrics: { avgTime: '3.1h', rate: '87%', ratingImpact: '+0.5' },
        heatmapWeeks: [
            [3, 5, 2, 4, 6, 9, 7],
            [4, 3, 5, 6, 7, 8, 5],
            [2, 6, 4, 5, 8, 10, 6],
            [5, 4, 3, 7, 6, 9, 8],
            [3, 7, 5, 4, 9, 11, 7],
            [6, 4, 3, 8, 7, 10, 9],
            [4, 5, 6, 3, 8, 12, 8],
            [5, 3, 4, 6, 7, 9, 6],
            [3, 6, 5, 7, 8, 11, 7],
            [4, 5, 3, 6, 9, 10, 8],
            [5, 4, 6, 5, 7, 8, 6],
            [3, 5, 4, 7, 8, 12, 9],
            [6, 4, 5, 3, 7, 10, 7],
        ],
        aiActions: [
            { severity: 'critical', title: 'Wi-Fi infrastructure overhaul needed', body: '22% of all reviews mention connectivity. Projected 0.5-star improvement if resolved. ROI on network upgrade: 7 months.' },
            { severity: 'critical', title: 'Noise insulation project recommended', body: 'East-wing rooms generate 3× more noise complaints. Soundproofing 15 rooms would reduce negative reviews by ~15%.' },
            { severity: 'warning', title: 'Restaurant needs menu refresh', body: 'Food category is your weakest at 67%. "Limited menu" appears in 39 reviews. A/B test new breakfast options.' },
            { severity: 'warning', title: 'Parking pricing competitiveness', body: 'Competitors average $18/day vs your $28/day. 51 reviews mention expensive parking — consider loyalty discounts.' },
            { severity: 'info', title: 'Staff training ROI confirmed', body: 'Staff score improved 7 points (76→83) since Q4 training program. Continue quarterly training investment.' },
            { severity: 'info', title: 'Response rate driving results', body: 'Properties responding to 90%+ of reviews average 0.4 stars higher. Your rate improved from 78% to 87% this quarter.' },
        ],
    },
};



// ═══════════════════════════════════════════════════════════════════
//  HELPER: Change badge
// ═══════════════════════════════════════════════════════════════════
const ChangeBadge = ({ value }: { value: string }) => {
    const num = parseFloat(value);
    const isUp = num > 0;
    const isNeutral = num === 0;
    const colors = isNeutral
        ? 'text-gray-500 bg-gray-100'
        : isUp
            ? 'text-emerald-600 bg-emerald-100'
            : 'text-red-600 bg-red-100';
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
    if (v === 0) return 'bg-gray-100';
    const ratio = v / max;
    if (ratio < 0.25) return 'bg-blue-100';
    if (ratio < 0.5) return 'bg-blue-200';
    if (ratio < 0.75) return 'bg-blue-400';
    return 'bg-blue-600';
};

// ═══════════════════════════════════════════════════════════════════
//  PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════
const InsightsPage: React.FC = () => {
    const [timeRange, setTimeRange] = useState('30d');
    const d = dataByRange[timeRange];

    // ── Sentiment chart coordinates ─────────────────────────────
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

    // ── Heatmap max ─────────────────────────────────────────────
    const heatMax = Math.max(...d.heatmapWeeks.flat(), 1);

    return (
        <div className="min-h-full bg-gray-50">
            <InsightsHeader timeRange={timeRange} onTimeRangeChange={setTimeRange} />

            <div className="flex-1 flex flex-col gap-6 p-4 md:px-8 md:py-6">

                {/* ═══ 1. KPI METRICS ROW ═══════════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 min-[1000px]:grid-cols-4 gap-4">
                    {[
                        { icon: <Zap size={20} />, label: 'Overall Score', value: `${d.overallScore}`, change: d.overallScoreChange, bg: 'bg-blue-50', fg: 'text-blue-500' },
                        { icon: <MessageSquare size={20} />, label: 'Total Reviews', value: d.totalReviews, change: d.totalReviewsChange, bg: 'bg-violet-50', fg: 'text-violet-500' },
                        { icon: <Star size={20} />, label: 'Avg Rating', value: d.avgRating, change: d.avgRatingChange, bg: 'bg-amber-50', fg: 'text-amber-500' },
                        { icon: <Clock size={20} />, label: 'Response Rate', value: d.responseRate, change: d.responseRateChange, bg: 'bg-emerald-50', fg: 'text-emerald-500' },
                    ].map((m) => (
                        <div key={m.label} className="flex items-center gap-3.5 p-[18px] bg-white border border-gray-200 rounded-xl transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                            <div className={`w-11 h-11 grid place-items-center ${m.bg} ${m.fg} rounded-[10px]`}>{m.icon}</div>
                            <div className="flex-1">
                                <p className="mb-1.5 text-[13px] text-gray-500 font-medium m-0">{m.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[26px] font-bold text-gray-800">{m.value}</span>
                                    <ChangeBadge value={m.change} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ═══ 2. SENTIMENT OVER TIME ════════════════════════ */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-1">
                        <h3 className="m-0 text-base font-bold text-gray-800">Sentiment Over Time</h3>
                        <div className="flex gap-4">
                            {[
                                { label: 'Positive', color: 'bg-blue-500' },
                                { label: 'Neutral', color: 'bg-slate-300' },
                                { label: 'Negative', color: 'bg-red-400' },
                            ].map((l) => (
                                <div key={l.label} className="flex items-center gap-1.5 text-[13px] text-gray-500">
                                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                                    <span>{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mt-4 h-[200px] bg-gradient-to-b from-blue-500/5 to-transparent rounded-lg">
                        <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-full">
                            {/* Grid lines */}
                            {[0.25, 0.5, 0.75].map((r) => (
                                <line key={r} x1="0" y1={chartH * r} x2={chartW} y2={chartH * r} stroke="#f3f4f6" strokeWidth="1" />
                            ))}
                            {/* Positive area */}
                            <path d={areaPath(d.sentimentPositive)} fill="#3b82f6" opacity="0.08" />
                            {/* Positive line */}
                            <polyline fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentPositive)} />
                            {/* Neutral line */}
                            <polyline fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4,4" points={linePoints(d.sentimentNeutral)} />
                            {/* Negative line */}
                            <polyline fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={linePoints(d.sentimentNegative)} />
                            {/* Positive dots */}
                            {d.sentimentPositive.map((v, i) => (
                                <circle key={i} cx={i * gapX} cy={toY(v)} r="4" fill="#3b82f6" />
                            ))}
                        </svg>
                    </div>
                    <div className={`grid text-center text-xs text-gray-400 mt-2`} style={{ gridTemplateColumns: `repeat(${sentLen}, 1fr)` }}>
                        {d.sentimentMonths.map((m) => <span key={m}>{m}</span>)}
                    </div>
                </div>

                {/* ═══ 3 + 4. RATING DISTRIBUTION + CATEGORY PERFORMANCE ═════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">

                    {/* Rating Distribution */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="m-0 text-base font-bold text-gray-800 mb-5">Rating Distribution</h3>
                        <div className="flex flex-col gap-3">
                            {d.ratingDistribution.map((r) => (
                                <div key={r.stars} className="grid grid-cols-[60px_1fr_70px] items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <Star size={14} className="text-amber-400" fill="#fbbf24" />
                                        <span className="text-sm font-semibold text-gray-700">{r.stars}</span>
                                    </div>
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${r.pct}%`,
                                                backgroundColor: r.stars >= 4 ? '#3b82f6' : r.stars === 3 ? '#94a3b8' : '#ef4444',
                                            }}
                                        />
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-semibold text-gray-700">{r.count}</span>
                                        <span className="text-xs text-gray-400 ml-1">({r.pct}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-500">Satisfaction Rate</span>
                            <span className="text-lg font-bold text-blue-600">
                                {d.ratingDistribution.filter((r) => r.stars >= 4).reduce((a, r) => a + r.pct, 0)}%
                            </span>
                        </div>
                    </div>

                    {/* Category Performance */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="m-0 text-base font-bold text-gray-800 mb-5">Category Performance</h3>
                        <div className="flex flex-col gap-3.5">
                            {d.categories.map((c) => {
                                const delta = c.score - c.prev;
                                return (
                                    <div key={c.name} className="grid grid-cols-[100px_1fr_80px] items-center gap-3">
                                        <span className="text-sm font-medium text-gray-700">{c.name}</span>
                                        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${c.score}%`,
                                                    backgroundColor: c.score >= 80 ? '#3b82f6' : c.score >= 60 ? '#f59e0b' : '#ef4444',
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            <span className="text-sm font-semibold text-gray-700">{c.score}%</span>
                                            <span className={`text-[11px] font-semibold ${delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-500">Top Category</span>
                            <span className="text-sm font-bold text-blue-600">
                                {d.categories.reduce((best, c) => (c.score > best.score ? c : best)).name} ({d.categories.reduce((best, c) => (c.score > best.score ? c : best)).score}%)
                            </span>
                        </div>
                    </div>
                </div>

                {/* ═══ 5. SOURCE BREAKDOWN ══════════════════════════ */}
                <SourceBreakdown timeRange={timeRange} />

                {/* ═══ 6. TOP KEYWORDS ═══════════════════════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">
                    {/* Positive keywords */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsUp size={16} className="text-emerald-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800">Top Positive Keywords</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {d.positiveKeywords.map((kw) => {
                                const maxCount = d.positiveKeywords[0].count;
                                const ratio = kw.count / maxCount;
                                const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                return (
                                    <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-medium border border-emerald-100 ${size}`}>
                                        {kw.word}
                                        <span className="text-emerald-400 font-normal text-[11px]">{kw.count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Negative keywords */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ThumbsDown size={16} className="text-red-500" />
                            <h3 className="m-0 text-base font-bold text-gray-800">Top Negative Keywords</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {d.negativeKeywords.map((kw) => {
                                const maxCount = d.negativeKeywords[0].count;
                                const ratio = kw.count / maxCount;
                                const size = ratio > 0.7 ? 'text-sm px-3 py-1.5' : ratio > 0.4 ? 'text-[13px] px-2.5 py-1' : 'text-xs px-2 py-0.5';
                                return (
                                    <span key={kw.word} className={`inline-flex items-center gap-1.5 bg-red-50 text-red-700 rounded-lg font-medium border border-red-100 ${size}`}>
                                        {kw.word}
                                        <span className="text-red-400 font-normal text-[11px]">{kw.count}</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ═══ 7. RESPONSE METRICS + 8. HEATMAP ══════════════ */}
                <div className="grid grid-cols-1 min-[1000px]:grid-cols-2 gap-5">

                    {/* Response Metrics */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <h3 className="m-0 text-base font-bold text-gray-800 mb-5">Response Metrics</h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Avg Response Time', value: d.responseMetrics.avgTime, icon: <Clock size={18} />, color: 'bg-blue-50 text-blue-500' },
                                { label: 'Response Rate', value: d.responseMetrics.rate, icon: <CheckCircle2 size={18} />, color: 'bg-emerald-50 text-emerald-500' },
                                { label: 'Rating Impact', value: d.responseMetrics.ratingImpact, icon: <TrendingUp size={18} />, color: 'bg-amber-50 text-amber-500' },
                            ].map((m) => (
                                <div key={m.label} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl">
                                    <div className={`w-10 h-10 grid place-items-center rounded-xl ${m.color} mb-3`}>{m.icon}</div>
                                    <span className="text-2xl font-bold text-gray-800">{m.value}</span>
                                    <span className="text-[11px] text-gray-500 mt-1 font-medium">{m.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gray-100">
                            <p className="text-[13px] text-gray-500 m-0 leading-relaxed">
                                <span className="font-semibold text-gray-700">Insight:</span> Responding within 2 hours correlates with
                                <span className="font-semibold text-blue-600"> {d.responseMetrics.ratingImpact}</span> star improvement in follow-up ratings.
                            </p>
                        </div>
                    </div>

                    {/* Review Volume Heatmap */}
                    <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="m-0 text-base font-bold text-gray-800">Review Volume</h3>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                                <span>Less</span>
                                <span className="w-3 h-3 rounded-sm bg-gray-100" />
                                <span className="w-3 h-3 rounded-sm bg-blue-100" />
                                <span className="w-3 h-3 rounded-sm bg-blue-200" />
                                <span className="w-3 h-3 rounded-sm bg-blue-400" />
                                <span className="w-3 h-3 rounded-sm bg-blue-600" />
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
                                {d.heatmapWeeks.map((week, wi) => (
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
                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[13px] text-gray-500">Peak day</span>
                            <span className="text-sm font-semibold text-gray-700">Saturdays — avg {Math.round(d.heatmapWeeks.reduce((s, w) => s + w[5], 0) / d.heatmapWeeks.length)} reviews</span>
                        </div>
                    </div>
                </div>

                {/* ═══ 9. AI RECOMMENDATIONS ═════════════════════════ */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 grid place-items-center bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg">
                            <Lightbulb size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="m-0 text-base font-bold text-gray-800">AI Recommendations</h3>
                            <p className="m-0 text-[11px] text-gray-400">Actionable insights based on review analysis</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        {d.aiActions.map((action, i) => {
                            const styles = {
                                critical: { border: 'border-red-200', bg: 'bg-red-50', icon: <AlertTriangle size={16} />, iconColor: 'text-red-500', label: 'Critical', labelBg: 'bg-red-100 text-red-600' },
                                warning: { border: 'border-amber-200', bg: 'bg-amber-50', icon: <Target size={16} />, iconColor: 'text-amber-500', label: 'Action', labelBg: 'bg-amber-100 text-amber-600' },
                                info: { border: 'border-blue-200', bg: 'bg-blue-50', icon: <BarChart3 size={16} />, iconColor: 'text-blue-500', label: 'Insight', labelBg: 'bg-blue-100 text-blue-600' },
                            }[action.severity];
                            return (
                                <div key={i} className={`flex items-start gap-3.5 p-4 rounded-xl border ${styles.border} ${styles.bg}`}>
                                    <div className={`w-8 h-8 grid place-items-center rounded-lg bg-white shrink-0 ${styles.iconColor}`}>
                                        {styles.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles.labelBg}`}>
                                                {styles.label}
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800">{action.title}</span>
                                        </div>
                                        <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{action.body}</p>
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

export default InsightsPage;
