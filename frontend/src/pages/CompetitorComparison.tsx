import { ArrowLeft, ChevronDown, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar
} from 'recharts';
import {
    fetchComparison,
    fetchAiInsights,
    fetchCompetitors,
    type ComparisonData,
    type AiInsights,
    type KpiData,
    type Competitor,
} from '../services/competitorService';
import { useOrganizationStore } from '../stores/useOrganizationStore';

const CompetitorComparison = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const competitorId = searchParams.get('id');

    const [comparison, setComparison] = useState<ComparisonData | null>(null);
    const [insights, setInsights] = useState<AiInsights | null>(null);
    const [trackedList, setTrackedList] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [insightsLoading, setInsightsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const currentOrg = useOrganizationStore(state => state.currentOrg);
    const organizationId = currentOrg?.id;

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const loadData = useCallback(async () => {
        if (!competitorId) {
            setError('No competitor ID specified. Go back and click Compare on a competitor.');
            setLoading(false);
            setInsightsLoading(false);
            return;
        }
        if (!organizationId) return;
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
    }, [competitorId, organizationId]);

    const loadInsights = useCallback(async () => {
        if (!competitorId || !organizationId) return;
        try {
            setInsightsLoading(true);
            const data = await fetchAiInsights(competitorId);
            setInsights(data);
        } catch {
            // silently fail
        } finally {
            setInsightsLoading(false);
        }
    }, [competitorId, organizationId]);

    useEffect(() => {
        loadData();
        loadInsights();
    }, [loadData, loadInsights]);

    useEffect(() => {
        fetchCompetitors().then(res => setTrackedList(res.tracked)).catch(() => {});
    }, []);

    const myName = comparison?.myOrganizationName ?? 'My Organization';
    const compName = comparison?.competitor.name ?? 'Competitor';

    const renderKpi = (title: string, kpi: KpiData, formatFn?: (v: number) => string, gapLabel?: string) => {
        const fmt = formatFn || ((v: number) => String(v));
        const gapColor = kpi.gap < 0 ? 'text-red-500' : kpi.gap > 0 ? 'text-green-600' : 'text-gray-500';
        const gapPrefix = kpi.gap > 0 ? '+' : '';
        const isAhead = kpi.gap < 0;
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col">
                <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-4">{title}</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-[#4e80ee] font-medium truncate max-w-[55%]" title={myName}>{myName}</span>
                        <span className="font-bold text-gray-900 dark:text-white text-[17px]">{fmt(kpi.myHotel)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-green-500 font-medium truncate max-w-[55%]" title={compName}>{compName}</span>
                        <span className="font-bold text-gray-900 dark:text-white text-[17px]">{fmt(kpi.competitor)}</span>
                    </div>
                    <div className="pt-3 border-t border-gray-50 dark:border-slate-700 flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-slate-400 font-medium">Gap</span>
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

    if (loading) {
        return <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900"><div className="text-gray-500">Loading comparison data...</div></div>;
    }

    if (error || !comparison) {
        return <div className="min-h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900"><div className="text-red-500">{error || 'Failed to load data.'}</div></div>;
    }

    const aspectData = comparison.aspectData;
    const trendData = comparison.trendData;
    const sentimentData = comparison.sentimentData;

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Competitor Comparison</h1>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                        {myName} <span className="text-gray-300 dark:text-slate-600 mx-1">vs</span> {compName}
                    </p>
                </div>

                {/* Single competitor selector dropdown */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setDropdownOpen(v => !v)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[180px] justify-between"
                    >
                        <span className="truncate font-medium">{compName}</span>
                        <ChevronDown size={15} className={`text-gray-400 dark:text-slate-500 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && trackedList.length > 0 && (
                        <div className="absolute right-0 top-full mt-1.5 w-56 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700">
                                Select Competitor
                            </p>
                            {trackedList.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        setDropdownOpen(false);
                                        navigate(`/competitor-comparison?id=${c.id}`);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                                        ${c.id === competitorId
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="w-full px-8 py-8 flex-1 max-w-[1400px] mx-auto space-y-8">
                <Link to="/competitors" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium transition-colors">
                    <ArrowLeft size={16} />
                    Back to Competitors
                </Link>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {renderKpi('Average Rating', comparison.kpis.avgRating, (v) => v.toFixed(1), `${compName} is ahead`)}
                    {renderKpi('Review Count', comparison.kpis.reviewCount, (v) => v.toLocaleString(), `Fewer reviews than ${compName}`)}
                    {renderKpi('Positive %', comparison.kpis.positivePercent, (v) => `${v}%`, 'Lower positive sentiment')}
                    {renderKpi('Negative %', comparison.kpis.negativePercent, (v) => `${v}%`, 'Higher negative sentiment')}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Radar */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-6">Aspect Comparison</h3>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={aspectData}>
                                    <PolarGrid gridType="polygon" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 500 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 5]} tickCount={6} tick={{ fill: '#374151', fontSize: 11, fontWeight: 'bold' }} axisLine={false} />
                                    <Radar name={myName} dataKey="myHotel" stroke="#4e80ee" fill="#4e80ee" fillOpacity={0.3} strokeWidth={2.5} dot={{ r: 4, fill: '#4e80ee' }} activeDot={{ r: 6 }} />
                                    <Radar name={compName} dataKey="competitor" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 6 }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#6b7280', paddingTop: '20px' }} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Rating Trend */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-6">Rating Trend</h3>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis domain={['dataMin - 0.2', 'dataMax + 0.2']} tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} width={50} />
                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                                    <Line type="monotone" dataKey="myHotel" name={myName} stroke="#4e80ee" strokeWidth={2} dot={{ r: 5, fill: '#4e80ee', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                    <Line type="monotone" dataKey="competitor" name={compName} stroke="#22c55e" strokeWidth={2} dot={{ r: 5, fill: '#22c55e', strokeWidth: 0 }} activeDot={{ r: 7 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Sentiment Distribution */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                        <h3 className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-6">Sentiment Distribution</h3>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sentimentData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={true} stroke="#f3f4f6" />
                                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <RechartsTooltip cursor={{ fill: '#f9fafb', opacity: 0.1 }} contentStyle={{ borderRadius: '8px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: '#fff', color: '#000' }} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                                    <Bar dataKey="competitor" name={compName} fill="#22c55e" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="myHotel" name={myName} fill="#4e80ee" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="bg-[#f5f8ff] dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50 p-6 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-[#4e80ee] dark:text-blue-400 font-black text-lg">
                        <Lightbulb size={22} className="text-[#4e80ee] dark:text-blue-400" />
                        AI-Generated Insights
                    </div>

                    {insightsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 animate-pulse">
                            <div className="h-3 w-3 bg-blue-300 rounded-full"></div>
                            Generating insights with AI...
                        </div>
                    ) : insights ? (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                {insights.strengths?.slice(0, 2).map((s, i) => (
                                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#dcfce7] dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold border border-green-200 dark:border-green-800/30 shadow-sm">
                                        <CheckCircle size={16} />
                                        {s}
                                    </div>
                                ))}
                                {insights.weaknesses?.slice(0, 1).map((w, i) => (
                                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-semibold border border-yellow-200 dark:border-yellow-800/30 shadow-sm">
                                        <AlertTriangle size={16} />
                                        {w}
                                    </div>
                                ))}
                            </div>
                            {insights.recommendations && insights.recommendations.length > 0 && (
                                <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                                    {insights.recommendations.slice(0, 3).map((r, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                                            {r}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </>
                    ) : (
                        <p className="text-sm text-gray-400 dark:text-slate-500">Unable to generate insights — Gemini API may be unavailable.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CompetitorComparison;
