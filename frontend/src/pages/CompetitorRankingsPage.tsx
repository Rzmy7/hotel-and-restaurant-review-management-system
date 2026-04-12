import { ArrowLeft, ArrowUpDown, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchRankings, type RankingEntry } from '../services/competitorService';

type SortKey = 'rating' | 'sentiment' | 'reviews';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'rating',    label: 'Average Rating' },
    { key: 'sentiment', label: 'Sentiment Score' },
    { key: 'reviews',   label: 'Review Count' },
];

const CompetitorRankingsPage = () => {
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('rating');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const loadRankings = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchRankings();
            setRankings(data.rankings);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load rankings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadRankings(); }, [loadRankings]);

    const sorted = useMemo(() => {
        const copy = [...rankings];
        copy.sort((a, b) => {
            if (sortBy === 'rating')    return b.rating    - a.rating;
            if (sortBy === 'sentiment') return b.sentiment - a.sentiment;
            return b.reviews - a.reviews;
        });
        return copy.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }, [rankings, sortBy]);

    const yourRank = sorted.find(r => r.isYou)?.rank ?? '-';
    const topPerformer = sorted[0];
    const currentSortLabel = SORT_OPTIONS.find(o => o.key === sortBy)?.label ?? 'Average Rating';

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        Competitor Rankings
                    </h1>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Overall performance comparison
                    </p>
                </div>

                {/* Single functional sort dropdown */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setDropdownOpen(v => !v)}
                        className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[170px] justify-between"
                    >
                        <span>{currentSortLabel}</span>
                        <ChevronDown size={15} className={`text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 border-b border-gray-100 dark:border-slate-700">
                                Sort Rankings By
                            </p>
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt.key}
                                    onClick={() => { setSortBy(opt.key); setDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                                        ${sortBy === opt.key
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">

                {/* Back */}
                <Link
                    to="/competitors"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm"
                >
                    <ArrowLeft size={16} className="text-gray-400 dark:text-slate-500" />
                    Back to Competitors
                </Link>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Your Current Rank</p>
                        <h2 className="text-[44px] leading-none font-bold text-[#3b82f6] dark:text-blue-400">#{yourRank}</h2>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Total Competitors</p>
                        <h2 className="text-[44px] leading-none font-bold text-gray-900 dark:text-white">{rankings.length}</h2>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Top Performer</p>
                        <div className="mt-1">
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">{topPerformer?.name || '-'}</h3>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{topPerformer?.rating || '-'}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rankings Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rankings Overview</h2>
                        <span className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
                            Sorted by: <span className="text-blue-500">{currentSortLabel}</span>
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[10%]">Rank</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[30%]">Organization Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div onClick={() => setSortBy('rating')} className={`flex items-center gap-1.5 cursor-pointer transition-colors ${sortBy === 'rating' ? 'text-blue-500' : 'hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Average Rating <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div onClick={() => setSortBy('sentiment')} className={`flex items-center gap-1.5 cursor-pointer transition-colors ${sortBy === 'sentiment' ? 'text-blue-500' : 'hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Sentiment Score <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div onClick={() => setSortBy('reviews')} className={`flex items-center gap-1.5 cursor-pointer transition-colors ${sortBy === 'reviews' ? 'text-blue-500' : 'hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Review Count <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {loading && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading rankings...</td></tr>
                                )}
                                {error && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-red-500">{error}</td></tr>
                                )}
                                {!loading && !error && sorted.length === 0 && (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No competitors tracked yet.</td></tr>
                                )}
                                {!loading && !error && sorted.map((competitor) => (
                                    <tr
                                        key={competitor.rank}
                                        className={`transition-colors ${competitor.isYou
                                            ? 'bg-blue-50/60 hover:bg-blue-50/80 dark:bg-blue-900/20 dark:hover:bg-blue-900/40'
                                            : 'hover:bg-gray-50/30 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <td className="px-6 py-[22px]">
                                            <span className="font-medium text-gray-500 dark:text-slate-400 text-[14px]">#{competitor.rank}</span>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-gray-900 dark:text-white text-[14px]">{competitor.name}</span>
                                                {competitor.isYou && (
                                                    <span className="px-2 py-0.5 bg-[#4e80ee] text-white text-[11px] font-bold rounded-md uppercase tracking-wider">You</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-900 dark:text-white text-[14px]">{competitor.rating.toFixed(1)}</span>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                </svg>
                                            </div>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 text-[14px]">{competitor.sentiment.toFixed(1)}%</span>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <span className="text-gray-500 dark:text-gray-400 text-[14px]">{competitor.reviews.toLocaleString()}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CompetitorRankingsPage;
