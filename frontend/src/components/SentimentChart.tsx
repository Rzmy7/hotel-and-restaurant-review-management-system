import { Smile, Meh, Frown, TrendingUp } from 'lucide-react';

const SentimentChart = () => {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">Sentiment Analysis</h3>
          <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Customer Feedback Tone</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
          <TrendingUp size={12} strokeWidth={3} />
          <span>+4.2%</span>
        </div>
      </div>

      <div className="flex gap-10 items-center max-md:flex-col lg:flex-row">
        {/* Advanced Donut Chart */}
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="posGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4e80ee" />
                <stop offset="100%" stopColor="#7ba3f5" />
              </linearGradient>
              <linearGradient id="neuGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="negGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle cx="100" cy="100" r="82" fill="none" stroke="#f8fafc" strokeWidth="20" />

            {/* Positive Segment - 68% */}
            <circle
              cx="100" cy="100" r="82" fill="none"
              stroke="url(#posGradient)" strokeWidth="20"
              strokeDasharray="350 165" strokeDashoffset="0"
              transform="rotate(-90 100 100)"
            />

            {/* Neutral Segment - 20% */}
            <circle
              cx="100" cy="100" r="82" fill="none"
              stroke="url(#neuGradient)" strokeWidth="20"
              strokeDasharray="103 412" strokeDashoffset="-350"
              transform="rotate(-90 100 100)"
            />

            {/* Negative Segment - 12% */}
            <circle
              cx="100" cy="100" r="82" fill="none"
              stroke="url(#negGradient)" strokeWidth="20"
              strokeDasharray="62 453" strokeDashoffset="-453"
              transform="rotate(-90 100 100)"
            />
          </svg>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <p className="m-0 text-4xl font-black text-gray-900 tracking-tighter">68<span className="text-xl">%</span></p>
            <p className="mt-0.5 text-[10px] uppercase font-black text-[#4e80ee] tracking-widest">Positive</p>
          </div>
        </div>

        {/* Premium Legend */}
        <div className="flex flex-col gap-3 flex-1 w-full">
          <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-[#4e80ee] group-hover:scale-110 transition-transform">
              <Smile size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Positive</p>
              <p className="text-sm font-black text-gray-900">848 reviews</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#4e80ee]">68%</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50/50 transition-all duration-300">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:scale-110 transition-transform">
              <Meh size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Neutral</p>
              <p className="text-sm font-black text-gray-900">249 reviews</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-500">20%</p>
            </div>
          </div>

          <div className="group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-rose-100 hover:bg-rose-50/50 transition-all duration-300">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 group-hover:scale-110 transition-transform">
              <Frown size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">Negative</p>
              <p className="text-sm font-black text-gray-900">150 reviews</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-rose-500">12%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;
