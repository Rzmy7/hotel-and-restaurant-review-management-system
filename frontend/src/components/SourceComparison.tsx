import React from 'react';
import { Star, TrendingUp, TrendingDown, Clock, Info } from 'lucide-react';

const sources = [
    {
        name: 'Booking.com',
        rating: 4.4,
        trend: '+0.2',
        trendType: 'up',
        reviews: 79,
        pct: 42,
        color: '#2563eb', // More professional Blue
        sentiment: { pos: 65, neu: 25, neg: 10 },
        lastSync: '2m ago'
    },
    {
        name: 'TripAdvisor',
        rating: 4.2,
        trend: '-0.1',
        trendType: 'down',
        reviews: 53,
        pct: 28,
        color: '#7c3aed', // More professional Purple
        sentiment: { pos: 58, neu: 30, neg: 12 },
        lastSync: '15m ago'
    },
    {
        name: 'Google',
        rating: 4.5,
        trend: '+0.1',
        trendType: 'up',
        reviews: 38,
        pct: 20,
        color: '#059669', // More professional Emerald
        sentiment: { pos: 72, neu: 18, neg: 10 },
        lastSync: '5m ago'
    },
    {
        name: 'Expedia',
        rating: 3.9,
        trend: '0.0',
        trendType: 'neutral',
        reviews: 19,
        pct: 10,
        color: '#d97706', // More professional Amber
        sentiment: { pos: 45, neu: 40, neg: 15 },
        lastSync: '1h ago'
    },
];

const totalReviews = sources.reduce((s, x) => s + x.reviews, 0);

/** Donut segment helper */
const createDonutPath = (pct: number, startAngle: number, R = 90, r = 60) => {
    const cx = 100, cy = 100;
    const a = (pct / 100) * 360;
    const end = startAngle + a;
    const rad = (d: number) => (Math.PI * d) / 180;
    const x1 = cx + R * Math.cos(rad(startAngle));
    const y1 = cy + R * Math.sin(rad(startAngle));
    const x2 = cx + R * Math.cos(rad(end));
    const y2 = cy + R * Math.sin(rad(end));
    const ix1 = cx + r * Math.cos(rad(startAngle));
    const iy1 = cy + r * Math.sin(rad(startAngle));
    const ix2 = cx + r * Math.cos(rad(end));
    const iy2 = cy + r * Math.sin(rad(end));
    const lg = a > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${R} ${R} 0 ${lg} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${r} ${r} 0 ${lg} 0 ${ix1} ${iy1} Z`;
};

const SentimentBar = ({ pos, neu, neg }: { pos: number; neu: number; neg: number }) => (
    <div className="flex h-1 w-full rounded-full overflow-hidden bg-gray-50 mt-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
        <div style={{ width: `${pos}%` }} className="bg-emerald-500/80 h-full" />
        <div style={{ width: `${neu}%` }} className="bg-slate-300 h-full" />
        <div style={{ width: `${neg}%` }} className="bg-rose-400 h-full" />
    </div>
);

const SourceComparison: React.FC = () => {
    let angle = -90;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-hidden relative">
            {/* Header section with distinct metrics-toggle layout */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 border-b border-gray-50 pb-5">
                <div>
                    <h3 className="m-0 text-base font-bold text-gray-900 flex items-center gap-2">
                        Source Comparison
                        <Info size={14} className="text-gray-300 cursor-help" />
                    </h3>
                    <p className="m-0 text-[11px] text-gray-500 font-medium uppercase tracking-tight mt-1">Volume & Sentiment Overview</p>
                </div>

                {/* Clean inline legend */}
                <div className="flex items-center gap-5 mt-4 sm:mt-0 bg-gray-50/50 px-4 py-2 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-1 rounded-full bg-rose-500" />
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Negative</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-12 items-center">
                {/* Donut focus */}
                <div className="flex flex-col items-center">
                    <div className="w-[180px] h-[180px] shrink-0 relative flex items-center justify-center">
                        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.03)] filter">
                            {sources.map((s) => {
                                const path = createDonutPath(s.pct, angle);
                                angle += (s.pct / 100) * 360;
                                return (
                                    <path
                                        key={s.name}
                                        d={path}
                                        fill={s.color}
                                        className="transition-all duration-300 hover:opacity-90 hover:scale-[1.02] origin-center cursor-default"
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{totalReviews}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Reviews</span>
                        </div>
                    </div>
                </div>

                {/* Details optimized for scanability */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-8">
                    {sources.map((s) => (
                        <div key={s.name} className="flex flex-col group relative">
                            {/* Source Info Bar */}
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-[4px] shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
                                    <span className="text-sm font-bold text-gray-900 tracking-tight">{s.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-1 bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100/50">
                                        <Star size={12} className="text-amber-500 fill-amber-500" />
                                        <span className="text-xs font-bold text-amber-700">{s.rating}</span>
                                    </div>
                                    <div className={`p-0.5 rounded ${s.trendType === 'up' ? 'text-emerald-500' : s.trendType === 'down' ? 'text-rose-500' : 'text-gray-300'}`}>
                                        {s.trendType === 'up' ? <TrendingUp size={12} /> : s.trendType === 'down' ? <TrendingDown size={12} /> : null}
                                    </div>
                                </div>
                            </div>

                            {/* Unified Volume Bar with Sub-metrics */}
                            <div className="space-y-3">
                                <div className="flex items-end justify-between text-[11px] font-bold pb-1 underline decoration-gray-100 underline-offset-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-[13px] text-gray-900 font-black">{s.pct}%</span>
                                        <span className="text-gray-400 font-medium tracking-tight">of total volume</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-400 font-medium italic">
                                        <Clock size={10} strokeWidth={3} />
                                        <span>{s.lastSync}</span>
                                    </div>
                                </div>

                                {/* Unified primary bar color: Dark Slate for all, emphasizing volume without "rainbow" effect */}
                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 ease-out bg-slate-700 opacity-90 group-hover:opacity-100"
                                        style={{ width: `${s.pct}%` }}
                                    />
                                </div>

                                <div className="pt-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Sentiment Mix</span>
                                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{s.sentiment.pos}% Positive</span>
                                    </div>
                                    <SentimentBar pos={s.sentiment.pos} neu={s.sentiment.neu} neg={s.sentiment.neg} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SourceComparison;
