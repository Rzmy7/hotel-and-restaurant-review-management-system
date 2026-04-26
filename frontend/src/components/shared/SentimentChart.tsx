import { useNavigate } from "react-router-dom";
import { Smile, Meh, Frown } from "lucide-react";
import type { SentimentDistribution } from "../../types/dashboard";

interface SentimentChartProps {
  data: SentimentDistribution;
}

const SentimentChart = ({ data }: SentimentChartProps) => {
  const navigate = useNavigate();
  const { positive, neutral, negative } = data;

  const handleFilterClick = (sentiment: string) => {
    navigate(`/reviews?sentiment=${sentiment}`);
  };

  // Calculate dash arrays based on percentages
  const totalLength = 515; // Circumference approx
  const posDash = (positive.percentage / 100) * totalLength;
  const neuDash = (neutral.percentage / 100) * totalLength;
  const negDash = (negative.percentage / 100) * totalLength;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">
            Sentiment Analysis
          </h3>
          <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            AI Generated Feedback
          </p>
        </div>
      </div>

      <div className="flex gap-10 items-center max-md:flex-col lg:flex-row">
        {/* Advanced Donut Chart */}
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient
                id="posGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#4e80ee" />
                <stop offset="100%" stopColor="#7ba3f5" />
              </linearGradient>
              <linearGradient
                id="neuGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient
                id="negGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>
            {/* Background Track */}
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="20"
            />
            {/* Positive Segment */}
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="url(#posGradient)"
              strokeWidth="20"
              strokeDasharray={`${posDash} ${totalLength - posDash}`}
              strokeDashoffset="0"
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000 ease-out cursor-pointer hover:brightness-110"
              onClick={() => handleFilterClick("Positive")}
            />
            {/* Neutral Segment */}
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="url(#neuGradient)"
              strokeWidth="20"
              strokeDasharray={`${neuDash} ${totalLength - neuDash}`}
              strokeDashoffset={-posDash}
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000 ease-out cursor-pointer hover:brightness-110"
              onClick={() => handleFilterClick("Neutral")}
            />
            {/* Negative Segment */}
            <circle
              cx="100"
              cy="100"
              r="82"
              fill="none"
              stroke="url(#negGradient)"
              strokeWidth="20"
              strokeDasharray={`${negDash} ${totalLength - negDash}`}
              strokeDashoffset={-(posDash + neuDash)}
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000 ease-out cursor-pointer hover:brightness-110"
              onClick={() => handleFilterClick("Negative")}
            />
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="m-0 text-4xl font-black text-gray-900 tracking-tighter">
              {positive.percentage}
              <span className="text-xl">%</span>
            </p>
            <p className="mt-0.5 text-[10px] uppercase font-black text-[#4e80ee] tracking-widest">
              Positive
            </p>
          </div>
        </div>

        {/* Premium Legend */}
        <div className="flex flex-col gap-3 flex-1 w-full">
          <button
            onClick={() => handleFilterClick("Positive")}
            className="w-full text-left group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-blue-100 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-[#4e80ee] group-hover:scale-110 transition-transform">
              <Smile size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">
                Positive
              </p>
              <p className="text-sm font-black text-gray-900">
                {positive.count} reviews
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#4e80ee]">
                {positive.percentage}%
              </p>
            </div>
          </button>

          <button
            onClick={() => handleFilterClick("Neutral")}
            className="w-full text-left group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:scale-110 transition-transform">
              <Meh size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">
                Neutral
              </p>
              <p className="text-sm font-black text-gray-900">
                {neutral.count} reviews
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-slate-400">
                {neutral.percentage}%
              </p>
            </div>
          </button>

          <button
            onClick={() => handleFilterClick("Negative")}
            className="w-full text-left group flex items-center gap-4 p-3 rounded-xl border border-transparent hover:border-rose-100 hover:bg-rose-50/30 transition-all duration-300 cursor-pointer"
          >
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 group-hover:scale-110 transition-transform">
              <Frown size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-1.5">
                Negative
              </p>
              <p className="text-sm font-black text-gray-900">
                {negative.count} reviews
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-rose-500">
                {negative.percentage}%
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SentimentChart;
