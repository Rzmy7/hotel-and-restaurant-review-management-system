import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Clock, Info, Layers } from 'lucide-react';
import type { SourceData } from '../../types/dashboard';

interface SourceComparisonProps {
    sources: SourceData[];
}

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
    <div className="flex h-1 w-full rounded-full overflow-hidden bg-white/50 mt-1.5 shadow-inner">
        <div style={{ width: `${pos}%` }} className="bg-[#4e80ee]/80 h-full" />
        <div style={{ width: `${neu}%` }} className="bg-slate-300 h-full" />
        <div style={{ width: `${neg}%` }} className="bg-rose-400 h-full" />
    </div>
);

const SourceComparison: React.FC<SourceComparisonProps> = ({ sources: rawSources }) => {
    const navigate = useNavigate();
    const [hoveredSource, setHoveredSource] = useState<string | null>(null);

    const totalReviews = rawSources.reduce((s, x) => s + x.reviews, 0);

    const handleSourceClick = (sourceName: string) => {
        if (sourceName === 'Others') return; // Others is an aggregate
        navigate(`/reviews?source=${sourceName}`);
    };

    const processedSources = useMemo(() => {
        const sorted = [...rawSources].sort((a, b) => b.reviews - a.reviews);
        if (sorted.length <= 6) return sorted;

        const top = sorted.slice(0, 5);
        const others = sorted.slice(5);
        const totalOtherReviews = others.reduce((s, x) => s + x.reviews, 0);
        const totalOtherPct = others.reduce((s, x) => s + x.pct, 0);
        const avgRating = others.reduce((s, x) => s + (x.rating * x.reviews), 0) / totalOtherReviews;

        const otherSentiment = others.reduce((acc, x) => {
            acc.pos += (x.sentiment.pos * x.reviews);
            acc.neu += (x.sentiment.neu * x.reviews);
            acc.neg += (x.sentiment.neg * x.reviews);
            return acc;
        }, { pos: 0, neu: 0, neg: 0 });

        otherSentiment.pos /= totalOtherReviews;
        otherSentiment.neu /= totalOtherReviews;
        otherSentiment.neg /= totalOtherReviews;

        return [...top, {
            name: 'Others',
            rating: parseFloat(avgRating.toFixed(1)),
            trend: '...',
            trendType: 'neutral' as const,
            reviews: totalOtherReviews,
            pct: totalOtherPct,
            color: '#64748b',
            bgColor: 'bg-slate-50/60',
            borderColor: 'border-slate-100',
            sentiment: {
                pos: Math.round(otherSentiment.pos),
                neu: Math.round(otherSentiment.neu),
                neg: Math.round(otherSentiment.neg)
            },
            lastSync: 'Varies',
            isOthers: true
        }];
    }, [rawSources]);

    let angle = -90;

    return (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm overflow-hidden relative transition-all duration-300 hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 border-b border-gray-50 pb-8">
                <div>
                    <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                        Source Comparison
                        <Info size={14} className="text-gray-300 cursor-help" />
                    </h3>
                    <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                        {rawSources.length} sources identified • Top performance clustering
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-4 sm:mt-0 bg-gray-50/50 px-4 py-2.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#4e80ee]" />
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Negative</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-12 items-center">
                <div className="flex flex-col items-center">
                    <div className="w-[180px] h-[180px] shrink-0 relative flex items-center justify-center">
                        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.03)] filter">
                            {processedSources.map((s) => {
                                const isHovered = hoveredSource === s.name;
                                const path = createDonutPath(s.pct, angle, isHovered ? 98 : 90, isHovered ? 56 : 60);
                                angle += (s.pct / 100) * 360;
                                return (
                                    <path
                                        key={s.name}
                                        d={path}
                                        fill={s.color}
                                        onMouseEnter={() => setHoveredSource(s.name)}
                                        onMouseLeave={() => setHoveredSource(null)}
                                        onClick={() => handleSourceClick(s.name)}
                                        className={`transition-all duration-300 ${s.name !== 'Others' ? 'cursor-pointer' : 'cursor-default'} ${isHovered ? 'brightness-110' : 'opacity-90 hover:opacity-100'}`}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-transform duration-300">
                            <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{totalReviews}</span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-2">Total</span>
                        </div>
                    </div>
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${processedSources.length > 4 ? 'lg:grid-cols-3' : ''} gap-4`}>
                    {processedSources.map((s) => {
                        const isHovered = hoveredSource === s.name;
                        const isCompact = processedSources.length > 4;

                        return (
                            <button
                                key={s.name}
                                onMouseEnter={() => setHoveredSource(s.name)}
                                onMouseLeave={() => setHoveredSource(null)}
                                onClick={() => handleSourceClick(s.name)}
                                className={`flex flex-col text-left group/source ${isCompact ? 'p-3' : 'p-4'} rounded-xl border-2 transition-all duration-300 focus:outline-none ${isHovered ? `${s.bgColor} ${s.borderColor} shadow-md scale-[1.02]` : 'bg-gray-50/30 border-transparent hover:bg-gray-50/60'} ${s.name !== 'Others' ? 'cursor-pointer' : 'cursor-default'}`}
                            >
                                <div className={`flex items-center justify-between w-full ${isCompact ? 'mb-2' : 'mb-4'}`}>
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        {s.isOthers ? (
                                            <Layers size={14} className="text-slate-500 shrink-0" />
                                        ) : (
                                            <div className="w-3 h-3 rounded-[4px] shrink-0 shadow-sm" style={{ backgroundColor: s.color }} />
                                        )}
                                        <span className={`font-black text-gray-900 tracking-tight truncate ${isCompact ? 'text-[13px]' : 'text-sm'}`}>{s.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">
                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                            <span className="text-[11px] font-bold text-gray-700">{s.rating}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`w-full ${isCompact ? 'space-y-2' : 'space-y-4'}`}>
                                    <div className="flex items-end justify-between text-[10px] font-bold pb-1 border-b border-black/5">
                                        <div className="flex items-baseline gap-1">
                                            <span className={`${isCompact ? 'text-[14px]' : 'text-lg'} text-gray-900 font-black leading-none`}>{s.pct}%</span>
                                            <span className="text-gray-400 font-medium tracking-tight">Share</span>
                                        </div>
                                        {!isCompact && (
                                            <div className="flex items-center gap-1.5 text-gray-400 font-medium whitespace-nowrap">
                                                <Clock size={10} strokeWidth={2.5} />
                                                <span>{s.lastSync}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className={`${isCompact ? 'space-y-2' : 'space-y-3'}`}>
                                        <div className="h-1.5 w-full bg-gray-200/50 rounded-full overflow-hidden shadow-inner">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out bg-slate-800 group-hover/source:brightness-110"
                                                style={{
                                                    width: `${s.pct}%`,
                                                    opacity: isHovered ? 1 : 0.85
                                                }}
                                            />
                                        </div>

                                        <div className={`${isCompact ? 'p-1.5' : 'p-2'} bg-white/40 rounded-lg border border-black/5`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Sentiment</span>
                                                <span className="text-[8px] font-black text-[#4e80ee] uppercase tabular-nums">{s.sentiment.pos}% Pos</span>
                                            </div>
                                            <SentimentBar pos={s.sentiment.pos} neu={s.sentiment.neu} neg={s.sentiment.neg} />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SourceComparison;