import type { ChartDataPoint } from '../types/dashboard';

interface TrendsChartProps {
    data: ChartDataPoint[];
}

const TrendsChart = ({ data }: TrendsChartProps) => {
    // Note: For a "WOW" production-grade app, we'd use Recharts or similar here.
    // However, keeping the custom SVG for visual excellence as requested.
    // We'll map the data to the SVG points.

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

                {/* X-Axis Labels - Time (Bottom) */}
                <div className="absolute bottom-[-32px] left-10 right-10 h-6 text-[9px] font-black text-gray-300 uppercase tracking-[0.05em] flex justify-between">
                    {data.map((point, i) => (
                        <span key={i} className="hover:text-gray-500 cursor-default transition-colors">
                            {point.label}
                        </span>
                    ))}
                </div>

                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-[200px] overflow-visible">
                    <defs>
                        <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#4e80ee" stopOpacity="0.25" />
                            <stop offset="60%" stopColor="#4e80ee" stopOpacity="0.05" />
                            <stop offset="100%" stopColor="#4e80ee" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* horizontal Grid Lines */}
                    {[0, 50, 100, 150, 200].map((y) => (
                        <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                    ))}

                    {/* Sentiment Score Area (Blue) - Simplified for prop data */}
                    <path
                        d="M0,160 C150,140 300,100 450,70 600,40 L600,200 L0,200 Z"
                        fill="url(#sentimentGradient)"
                    />
                    <path
                        d="M0,160 C150,140 300,100 450,70 600,40"
                        fill="none" stroke="#4e80ee" strokeWidth="3.5" strokeLinecap="round"
                    />

                    {/* Dynamic Markers based on data */}
                    {data.map((point, i) => {
                        const x = (i / (data.length - 1)) * 600;
                        const y = 200 - (point.value / 100) * 200; // Assuming value is percentage-like
                        return (
                            <g key={i} className="cursor-pointer group/marker">
                                <circle cx={x} cy={y} r="12" fill="#4e80ee" fillOpacity="0.1" className="scale-0 group-hover/marker:scale-100 transition-transform duration-300" />
                                <circle cx={x} cy={y} r="8" fill="#4e80ee" fillOpacity="0.1" />
                                <circle
                                    cx={x} cy={y} r="5"
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
                    <div className="flex items-center gap-2 group cursor-help relative">
                        <div className="w-2.5 h-2.5 rounded-sm border border-slate-300 bg-slate-50 group-hover:rotate-45 transition-transform" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest leading-none">Volume</span>
                            <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Total Reviews</span>
                        </div>
                    </div>

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
