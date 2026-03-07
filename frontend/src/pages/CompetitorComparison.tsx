import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, AlertTriangle, Lightbulb, CheckCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar
} from 'recharts';
import {
    fetchComparison,
    fetchAiInsights,
    type ComparisonData,
    type AiInsights,
    type KpiData,
} from '../api/competitorApi';

const CompetitorComparison = () => {
    const [searchParams] = useSearchParams();
    const competitorId = Number(searchParams.get('id'));

    const [comparison, setComparison] = useState<ComparisonData | null>(null);
    const [insights, setInsights] = useState<AiInsights | null>(null);
    const [loading, setLoading] = useState(true);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!competitorId) {
            setError('No competitor ID specified. Go back and click Compare on a competitor.');
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const data = await fetchComparison(competitorId);
            setComparison(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load comparison data');
        } finally {
            setLoading(false);
        }
    }, [competitorId]);

    const loadInsights = useCallback(async () => {
        if (!competitorId) return;
        try {
            setInsightsLoading(true);
            const data = await fetchAiInsights(competitorId);
            setInsights(data);
        } catch {
            // silently fail for insights — not critical
        } finally {
            setInsightsLoading(false);
        }
    }, [competitorId]);

    useEffect(() => {
        loadData();
        loadInsights();
    }, [loadData, loadInsights]);

    const renderKpi = (title: string, kpi: KpiData, formatFn?: (v: number) => string, gapLabel?: string) => {
        const fmt = formatFn || ((v: number) => String(v));
        const gapColor = kpi.gap < 0 ? 'text-red-500' : kpi.gap > 0 ? 'text-green-600' : 'text-gray-500';
        const gapPrefix = kpi.gap > 0 ? '+' : '';
        const isAhead = kpi.gap < 0;
        return (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{title}</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-[#4e80ee] font-medium">My Hotel</span>
                        <span className="font-bold text-gray-900 text-[17px]">{fmt(kpi.myHotel)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-green-500 font-medium">Competitor</span>
                        <span className="font-bold text-gray-900 text-[17px]">{fmt(kpi.competitor)}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-50 flex justify-between items-center text-sm">
                        <span className="text-gray-600 font-medium">Gap</span>
                        <span className={`font-bold ${gapColor}`}>{gapPrefix}{fmt(kpi.gap)}</span>
                    </div>
                    {isAhead && gapLabel && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 italic mt-1">
                            <AlertTriangle size={12} className="text-gray-400" />
                            <span>{gapLabel}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-full bg-gray-50 flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-4">
                    <button className="text-gray-600 hover:text-black transition-colors md:hidden" aria-label="Menu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Competitor Comparison</h1>
                        <p className="mt-1 text-sm text-gray-400">
                            {comparison ? `Your Hotel vs ${comparison.competitor.name}` : 'Performance comparison overview'}
                        </p>
                    </div>
                </div>
            </header>

            <main className="w-full px-8 py-8 flex-1 max-w-[1400px] mx-auto space-y-8">
                <Link to="/competitors" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
                    <ArrowLeft size={16} />
                    Back to Competitors
                </Link>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-500">Loading comparison data...</span>
                    </div>
                )}

                {!loading && comparison && (
                    <>
                        {/* KPI Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {renderKpi('Average Rating', comparison.kpis.avgRating, (v) => v.toFixed(2), 'Competitor is ahead')}
                            {renderKpi('Review Count', comparison.kpis.reviewCount, (v) => Math.abs(v).toLocaleString(), 'Fewer reviews than competitor')}
                            {renderKpi('Positive %', comparison.kpis.positivePercent, (v) => `${v}%`, 'Lower positive sentiment')}
                            {renderKpi('Negative %', comparison.kpis.negativePercent, (v) => `${Math.abs(v)}%`, 'Higher negative sentiment')}
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Aspect Comparison Radar */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-6">Aspect Comparison</h3>
                                <div className="h-[280px] w-full">
                                    {comparison.aspectData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparison.aspectData}>
                                                <PolarGrid gridType="polygon" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} />
                                                <PolarRadiusAxis
                                                    angle={90}
                                                    domain={[0, 5]}
                                                    tickCount={6}
                                                    tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }}
                                                    axisLine={false}
                                                />
                                                <Radar name="Your Hotel" dataKey="myHotel" stroke="#4e80ee" fill="#4e80ee" fillOpacity={0.3} strokeWidth={2.5} dot={{ r: 4, fill: '#4e80ee' }} activeDot={{ r: 6 }} />
                                                <Radar name="Competitor" dataKey="competitor" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 6 }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#6b7280', paddingTop: '20px' }} />
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">No aspect data available</div>
                                    )}
                                </div>
                            </div>

                            {/* Rating Trend Line */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-6">Rating Trend</h3>
                                <div className="h-[280px] w-full">
                                    {comparison.trendData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={comparison.trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f3f4f6" />
                                                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                                                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                                                <Line type="monotone" dataKey="myHotel" name="Your Hotel" stroke="#4e80ee" strokeWidth={2} dot={{ r: 5, fill: '#4e80ee', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                                <Line type="monotone" dataKey="competitor" name="Competitor" stroke="#22c55e" strokeWidth={2} dot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">No trend data available</div>
                                    )}
                                </div>
                            </div>

                            {/* Sentiment Distribution Bar */}
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                                <h3 className="text-base font-bold text-gray-900 mb-6">Sentiment Distribution</h3>
                                <div className="h-[280px] w-full">
                                    {comparison.sentimentData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={comparison.sentimentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f3f4f6" />
                                                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                                                <Bar dataKey="competitor" name="Competitor" fill="#22c55e" radius={[2, 2, 0, 0]} />
                                                <Bar dataKey="myHotel" name="Your Hotel" fill="#4e80ee" radius={[2, 2, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">No sentiment data available</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AI-Generated Insights */}
                        <div className="bg-[#f5f8ff] rounded-xl border border-blue-100 p-6 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-[#4e80ee] font-black text-lg">
                                <Lightbulb size={22} className="text-[#4e80ee]" />
                                AI-Generated Insights
                            </div>

                            {insightsLoading ? (
                                <div className="flex items-center gap-2 text-gray-400 text-sm py-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Generating insights with AI...
                                </div>
                            ) : insights ? (
                                <>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {insights.tags.map((tag, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border shadow-sm ${
                                                    tag.type === 'positive'
                                                        ? 'bg-[#dcfce7] text-green-700 border-green-200'
                                                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}
                                            >
                                                {tag.type === 'positive' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                                {tag.label}
                                            </div>
                                        ))}
                                    </div>

                                    {insights.strengths.length > 0 && (
                                        <div className="mt-2">
                                            <h4 className="text-sm font-bold text-green-700 mb-1">Strengths</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                {insights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {insights.weaknesses.length > 0 && (
                                        <div className="mt-2">
                                            <h4 className="text-sm font-bold text-red-600 mb-1">Weaknesses</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                {insights.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {insights.recommendations.length > 0 && (
                                        <div className="mt-2">
                                            <h4 className="text-sm font-bold text-blue-700 mb-1">Recommendations</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                                {insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-gray-400">Could not generate insights at this time.</p>
                            )}
                        </div>
                    </>
                )}

            </main>
        </div>
    );
};

export default CompetitorComparison;
