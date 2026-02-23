import { useToast } from '../contexts/ToastContext';
import { Sparkles, ThumbsUp, ThumbsDown, Brain, Zap, TrendingUp, ChevronRight } from 'lucide-react';

const AIInsights = () => {
  const { showToast } = useToast();

  const strengths = [
    { label: 'Staff responsiveness', impact: 'High', freq: '82%' },
    { label: 'Central location', impact: 'Med', freq: '74%' },
    { label: 'Room cleanliness', impact: 'High', freq: '91%' },
  ];

  const issues = [
    { label: 'Wi-Fi connectivity', impact: 'Critical', freq: '34%' },
    { label: 'Breakfast variety', impact: 'Low', freq: '12%' },
    { label: 'A/C noise level', impact: 'Med', freq: '18%' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col h-full shadow-sm relative overflow-hidden group">
      {/* Decorative AI background element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>

      <div className="flex justify-between items-center mb-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="m-0 text-base font-bold text-gray-800">AI Analysis</h3>
            <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Live Processing</p>
          </div>
        </div>
        <button
          className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn"
          onClick={() => showToast('Full AI Insights report coming soon', 'info')}
        >
          Detailed Report
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 flex-1">
        {/* Liked Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <h4 className="m-0 text-xs font-bold text-gray-500 uppercase tracking-tight">Key Strengths</h4>
          </div>
          <div className="space-y-2">
            {strengths.map((item) => (
              <div key={item.label} className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-xl hover:bg-emerald-50/50 transition-colors group/item">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-800">{item.label}</span>
                  <ThumbsUp size={12} className="text-emerald-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded uppercase tracking-tighter">Impact: {item.impact}</span>
                  <span className="text-[10px] font-medium text-gray-400">{item.freq} mention rate</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complaints Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            <h4 className="m-0 text-xs font-bold text-gray-500 uppercase tracking-tight">Critical Issues</h4>
          </div>
          <div className="space-y-2">
            {issues.map((item) => (
              <div key={item.label} className="p-3 bg-rose-50/30 border border-rose-100/50 rounded-xl hover:bg-rose-50/50 transition-colors group/item">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-800">{item.label}</span>
                  <ThumbsDown size={12} className="text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${item.impact === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                    {item.impact}
                  </span>
                  <span className="text-[10px] font-medium text-gray-400">{item.freq} dissatisfaction</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Generated Highlight Card */}
      <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl relative overflow-hidden shadow-lg shadow-blue-200/50">
        <Sparkles className="absolute -top-2 -right-2 text-white/10" size={64} />
        <div className="flex items-center gap-3 mb-2">
          <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-md">
            <Zap size={14} className="text-amber-300 fill-amber-300" />
          </div>
          <span className="text-[11px] font-bold text-white/80 uppercase tracking-widest italic">AI Highlight</span>
        </div>
        <p className="m-0 text-sm font-medium text-white leading-relaxed">
          Wi-Fi dissatisfaction reached a <span className="text-amber-300 font-bold underline decoration-amber-300/30 offset-2">critical 34% peak</span> last Tuesday. Immediate infrastructure review is recommended.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <TrendingUp size={12} className="text-emerald-300" />
          <span className="text-[10px] font-bold text-emerald-300 uppercase">+12% correlation with negative sentiment</span>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
