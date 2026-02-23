
import { TrendingUp } from 'lucide-react';

const TrendsChart = () => {
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="m-0 text-sm font-black text-gray-900 uppercase tracking-widest">Review Trends</h3>
                    <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Advanced Analytical Dashboard</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold border border-blue-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-blue-400/10 animate-pulse" />
                        <TrendingUp size={12} strokeWidth={3} className="relative z-10" />
                        <span className="relative z-10">AI Optimization Detected</span>
                    </div>
                </div>
            </div>

            <div className="relative h-[200px] mb-8 group/chart">
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <defs>
                        <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                            <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                        <linearGradient id="countGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* horizontal Grid Lines */}
                    {[0, 50, 100, 150, 200].map((y) => (
                        <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    ))}

                    {/* Vertical Analytical Grid (Months) */}
                    {[0, 150, 300, 450, 600].map((x) => (
                        <line key={x} x1={x} y1="0" x2={x} y2="200" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 2" />
                    ))}

                    {/* AI Event Markers */}
                    <g className="opacity-60 transition-opacity hover:opacity-100">
                        <line x1="150" y1="20" x2="150" y2="130" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />
                        <rect x="135" y="0" width="30" height="15" rx="4" fill="#3b82f6" fillOpacity="0.1" />
                        <text x="150" y="10" textAnchor="middle" className="text-[8px] font-black fill-blue-600 uppercase tracking-tighter">Event</text>
                    </g>

                    <g className="opacity-60 transition-opacity hover:opacity-100">
                        <line x1="450" y1="20" x2="450" y2="70" stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />
                        <rect x="420" y="0" width="60" height="15" rx="4" fill="#3b82f6" fillOpacity="0.1" />
                        <text x="450" y="10" textAnchor="middle" className="text-[8px] font-black fill-blue-600 uppercase tracking-tighter">Peak Growth</text>
                    </g>

                    {/* Review Count Area (Slate) - Smoothed Line */}
                    <path
                        d="M0,120 C50,118 100,110 150,115 C200,120 250,125 300,118 C350,110 400,122 450,115 C500,105 550,110 600,100 L600,200 L0,200 Z"
                        fill="url(#countGradient)"
                    />
                    <path
                        d="M0,120 C50,118 100,110 150,115 C200,120 250,125 300,118 C350,110 400,122 450,115 C500,105 550,110 600,100"
                        fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4"
                    />

                    {/* Sentiment Score Area (Blue) - Smoothed Line */}
                    <path
                        d="M0,160 C50,155 100,140 150,130 C200,120 250,110 300,100 C350,90 400,80 450,70 C500,60 550,50 600,40 L600,200 L0,200 Z"
                        fill="url(#sentimentGradient)"
                    />
                    <path
                        d="M0,160 C50,155 100,140 150,130 C200,120 250,110 300,100 C350,90 400,80 450,70 C500,60 550,50 600,40"
                        fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round"
                    />

                    {/* Key Data Markers - Elite Glow Style */}
                    {[0, 150, 300, 450, 600].map((x, i) => {
                        const heights = [160, 130, 100, 70, 40];
                        return (
                            <g key={i} className="cursor-pointer group/marker">
                                {/* Glow effect */}
                                <circle cx={x} cy={heights[i]} r="12" fill="#3b82f6" fillOpacity="0.1" className="scale-0 group-hover/marker:scale-100 transition-transform duration-300" />
                                <circle cx={x} cy={heights[i]} r="8" fill="#3b82f6" fillOpacity="0.1" />
                                {/* Main point */}
                                <circle
                                    cx={x} cy={heights[i]} r="5"
                                    fill="white" stroke="#3b82f6" strokeWidth="3"
                                    className="drop-shadow-sm transition-all duration-300 group-hover/marker:r-6"
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="flex justify-between items-center px-1">
                <div className="flex gap-8">
                    <div className="flex items-center gap-2 group cursor-help">
                        <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-slate-50 group-hover:rotate-45 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest leading-none">Volume</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Reviews</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 group cursor-help">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50 group-hover:scale-125 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest leading-none">Intelligence</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Sentiment</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] relative">
                    <span className="hover:text-gray-500 cursor-default transition-colors">Jan</span>
                    <span className="hover:text-gray-500 cursor-default transition-colors text-blue-400/50">Mar</span>
                    <span className="hover:text-gray-500 cursor-default transition-colors">May</span>
                    <span className="hover:text-gray-500 cursor-default transition-colors text-blue-600 font-bold">Jul</span>
                </div>
            </div>
        </div>
    );
};

export default TrendsChart;
