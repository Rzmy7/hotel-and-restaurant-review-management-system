
import { TrendingUp } from 'lucide-react';

const TrendsChart = () => {
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Review Trends</h3>
                    <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Historical Analytics</p>
                </div>
            </div>

            <div className="relative h-[220px] mb-10 mt-4 px-10 group/chart">
                {/* Y-Axis Labels - Sentiment % (Left) */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-0 text-[10px] font-black text-[#4e80ee]/80 pr-2 items-end h-[200px]">
                    <span>100%</span>
                    <span>75%</span>
                    <span>50%</span>
                    <span>25%</span>
                    <span className="translate-y-1">0%</span>
                </div>

                {/* Y-Axis Labels - Volume (Right) */}
                <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-0 text-[10px] font-black text-slate-400/80 pl-2 items-start h-[200px]">
                    <span>1000</span>
                    <span>750</span>
                    <span>500</span>
                    <span>250</span>
                    <span className="translate-y-1">0</span>
                </div>

                {/* X-Axis Labels - Time (Bottom) aligned to Grid */}
                <div className="absolute bottom-[-32px] left-10 right-10 h-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.05em]">
                    <span className="absolute left-0 hover:text-gray-500 cursor-default transition-colors">Jan 2026</span>
                    <span className="absolute left-[25%] -translate-x-1/2 hover:text-gray-500 cursor-default transition-colors text-blue-400/30">Mar 2026</span>
                    <span className="absolute left-[50%] -translate-x-1/2 hover:text-gray-500 cursor-default transition-colors">May 2026</span>
                    <span className="absolute left-[75%] -translate-x-1/2 hover:text-gray-500 cursor-default transition-colors">Jun 2026</span>
                    <span className="absolute right-0 hover:text-gray-500 cursor-default transition-colors text-[#4e80ee] font-bold">Jul 2026</span>
                </div>

                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-[200px] overflow-visible">
                    <defs>
                        <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4e80ee" stopOpacity="0.25" />
                            <stop offset="60%" stopColor="#4e80ee" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#4e80ee" stopOpacity="0" />
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
                        fill="none" stroke="#4e80ee" strokeWidth="3.5" strokeLinecap="round"
                    />

                    {/* Key Data Markers - Elite Glow Style */}
                    {[0, 150, 300, 450, 600].map((x, i) => {
                        const heights = [160, 130, 100, 70, 40];
                        return (
                            <g key={i} className="cursor-pointer group/marker">
                                {/* Glow effect */}
                                <circle cx={x} cy={heights[i]} r="12" fill="#4e80ee" fillOpacity="0.1" className="scale-0 group-hover/marker:scale-100 transition-transform duration-300" />
                                <circle cx={x} cy={heights[i]} r="8" fill="#4e80ee" fillOpacity="0.1" />
                                {/* Main point */}
                                <circle
                                    cx={x} cy={heights[i]} r="5"
                                    fill="white" stroke="#4e80ee" strokeWidth="3"
                                    className="drop-shadow-sm transition-all duration-300 group-hover/marker:r-6"
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>

            <div className="flex justify-between items-center px-1">
                <div className="flex gap-8">
                    {/* Volume Legend with Precise Hover Explanation */}
                    <div className="flex items-center gap-2 group cursor-help relative">
                        <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-slate-50 group-hover:rotate-45 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest leading-none">Volume</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Total Reviews</span>
                        </div>
                    </div>

                    {/* Intelligence Legend with Precise Hover Explanation */}
                    <div className="flex items-center gap-2 group cursor-help relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#4e80ee] ring-4 ring-blue-50 group-hover:scale-125 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest leading-none">AI Sentiment</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Success Rate</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrendsChart;
