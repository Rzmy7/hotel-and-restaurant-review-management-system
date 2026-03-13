import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Brain, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import type { AIInsightsData } from '../../types/dashboard';

interface AIInsightsProps {
  data: AIInsightsData;
}

const AIInsights = ({ data }: AIInsightsProps) => {
  const navigate = useNavigate();
  const { strengths, issues, highlight } = data;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col h-full shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
      {/* Decorative AI background element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>

      <div className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-blue-50 rounded-xl text-blue-600 border border-blue-100/50">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">AI Insights</h3>
            <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Live Processing</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
          onClick={() => navigate('/insights')}
        >
          Detailed Report
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-1">
        {/* Liked Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4e80ee]"></div>
            <h4 className="m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest">Key Strengths</h4>
          </div>
          <div className="space-y-2.5">
            {strengths.map((item) => (
              <div key={item.label} className="p-3.5 bg-blue-50/20 border border-blue-100/30 rounded-xl hover:bg-blue-50/40 transition-colors group/item">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-black text-gray-800">{item.label}</span>
                  <ThumbsUp size={12} className="text-[#4e80ee] opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-[#4e80ee] rounded uppercase tracking-widest">Impact: {item.impact}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.freq} mention rate</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complaints Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            <h4 className="m-0 text-[10px] font-black text-gray-400 uppercase tracking-widest">Critical Issues</h4>
          </div>
          <div className="space-y-2.5">
            {issues.map((item) => (
              <div key={item.label} className="p-3.5 bg-rose-50/20 border border-rose-100/30 rounded-xl hover:bg-rose-50/40 transition-colors group/item">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13px] font-black text-gray-800">{item.label}</span>
                  <ThumbsDown size={12} className="text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${item.impact === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                    {item.impact}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.freq} dissatisfaction</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Generated Highlight Card */}
      <div className="p-5 bg-blue-50/40 border border-blue-100/60 rounded-2xl relative overflow-hidden group/highlight shadow-sm">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover/highlight:bg-blue-500/10 transition-colors duration-500"></div>
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <div className="p-1.5 bg-blue-100/50 rounded-lg text-blue-600">
            <Zap size={14} className="fill-blue-600" />
          </div>
          <span className="text-[10px] font-black text-blue-600/80 uppercase tracking-[0.2em] italic">AI Highlight</span>
        </div>
        <p className="m-0 text-[13px] font-bold text-gray-700 leading-relaxed relative z-10">
          {highlight.text}
        </p>
        <div className="mt-4 flex items-center gap-2 relative z-10">
          <TrendingUp size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{highlight.correlation}</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
