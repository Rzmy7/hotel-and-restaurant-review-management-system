import React from 'react';
import { Star } from 'lucide-react';

const sources = [
    { name: 'Booking.com', rating: 4.4, reviews: 79, pct: 42, color: '#3b82f6' },
    { name: 'TripAdvisor', rating: 4.2, reviews: 53, pct: 28, color: '#8b5cf6' },
    { name: 'Google', rating: 4.5, reviews: 38, pct: 20, color: '#10b981' },
    { name: 'Expedia', rating: 3.9, reviews: 19, pct: 10, color: '#f59e0b' },
];

const totalReviews = sources.reduce((s, x) => s + x.reviews, 0);

/** Donut segment helper */
const createDonutPath = (pct: number, startAngle: number, R = 90, r = 55) => {
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

const SourceComparison: React.FC = () => {
    let angle = -90;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="m-0 text-base font-bold text-gray-800 mb-5">Source Comparison</h3>

            <div className="flex gap-8 items-start max-md:flex-col">
                {/* Donut */}
                <div className="w-[180px] h-[180px] shrink-0 relative">
                    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-sm">
                        {sources.map((s) => {
                            const path = createDonutPath(s.pct, angle);
                            angle += (s.pct / 100) * 360;
                            return <path key={s.name} d={path} fill={s.color} />;
                        })}
                    </svg>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        <p className="m-0 text-2xl font-extrabold text-gray-800">{totalReviews}</p>
                        <p className="mt-0.5 text-[11px] text-gray-400">reviews</p>
                    </div>
                </div>

                {/* Source rows */}
                <div className="flex-1 w-full flex flex-col gap-3.5">
                    {sources.map((s) => (
                        <div key={s.name} className="flex items-center gap-3">
                            <div className="flex items-center gap-2 w-[120px] shrink-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                                <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                            </div>
                            <div className="flex items-center gap-1 w-[52px] shrink-0">
                                <Star size={12} className="text-amber-400" fill="#fbbf24" />
                                <span className="text-sm font-semibold text-gray-700">{s.rating}</span>
                            </div>
                            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-500 w-[68px] text-right shrink-0">
                                {s.reviews} reviews
                            </span>
                            <span className="text-sm font-bold text-gray-700 w-[36px] text-right shrink-0">{s.pct}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SourceComparison;
