import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Brain, Zap, TrendingUp, ChevronRight } from 'lucide-react';
import type { AIInsightsData } from '../../../types/dashboard';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';

export interface AIInsightsProps {
    data: AIInsightsData;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ data }) => {
    const navigate = useNavigate();
    const { strengths, issues, highlight } = data;

    return (
        <Card hoverEffect className="shadow-sm p-6 flex flex-col h-full group relative">
            {/* Decorative AI background element */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>

            <SectionHeader
                title="AI Insights"
                subtitle="Live Processing"
                icon={<Brain size={18} />}
                iconClassName="bg-blue-50 text-blue-600 border border-blue-100/50"
                className="mb-8 items-center shrink-0 z-10"
            >
                <button
                    className="flex items-center gap-1 text-blue-600 font-bold text-xs hover:text-blue-700 transition-colors group/btn cursor-pointer bg-transparent border-none"
                    onClick={() => navigate('/insights')}
                >
                    Detailed Report
                    <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
            </SectionHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 flex-1 z-10">
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
                                    <span className="text-[13px] font-black text-gray-800 dark:text-gray-200">{item.label}</span>
                                    <ThumbsUp size={12} className="text-[#4e80ee] opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-[#4e80ee] dark:text-blue-400 rounded uppercase tracking-widest">Impact: {item.impact}</span>
                                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">{item.freq} mention rate</span>
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
                                    <span className="text-[13px] font-black text-gray-800 dark:text-gray-200">{item.label}</span>
                                    <ThumbsDown size={12} className="text-rose-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${item.impact === 'Critical' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                        }`}>
                                        {item.impact}
                                    </span>
                                    <span className="text-[9px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">{item.freq} dissatisfaction</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Generated Highlight Card */}
            <div className="p-5 bg-blue-50/40 dark:bg-slate-800/80 border border-blue-100/60 dark:border-blue-900/30 rounded-2xl relative overflow-hidden group/highlight shadow-sm z-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover/highlight:bg-blue-500/10 transition-colors duration-500"></div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                    <div className="p-1.5 bg-blue-100/50 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                        <Zap size={14} className="fill-blue-600 dark:fill-blue-400" />
                    </div>
                    <span className="text-[10px] font-black text-blue-600/80 dark:text-blue-400/80 uppercase tracking-[0.2em] italic">AI Highlight</span>
                </div>
                <p className="m-0 text-[13px] font-bold text-gray-700 dark:text-gray-200 leading-relaxed relative z-10">
                    {highlight.text}
                </p>
                <div className="mt-4 flex items-center gap-2 relative z-10">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{highlight.correlation}</span>
                </div>
            </div>
        </Card>
    );
};

export default AIInsights;
