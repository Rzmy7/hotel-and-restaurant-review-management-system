import { ChevronDown, ArrowLeft, ArrowUpDown, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchRankings, type RankingEntry } from '../api/competitorApi';

type SortKey = 'rating' | 'sentiment' | 'reviews';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'rating', label: 'Average Rating' },
    { key: 'sentiment', label: 'Sentiment Score' },
    { key: 'reviews', label: 'Review Count' },
];

const CompetitorRankingsPage = () => {
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('rating');
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        loadRankings();
    }, [loadRankings]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
                setIsSortMenuOpen(false);
            }
        };

        if (isSortMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSortMenuOpen]);

    const sorted = useMemo(() => {
        const copy = [...rankings];
        copy.sort((a, b) => {
            if (sortBy === 'rating') return b.rating - a.rating;
            if (sortBy === 'sentiment') return b.sentiment - a.sentiment;
            return b.reviews - a.reviews;
        });
        return copy.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }, [rankings, sortBy]);

    const yourRank = sorted.find(r => r.isYou)?.rank ?? '-';
    const topPerformer = sorted[0];
    const activeSortLabel = SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? 'Average Rating';

    const handleSort = (key: SortKey) => {
        setSortBy(key);
        setIsSortMenuOpen(false);
    };

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header Section */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu icon from mockup */}
                     
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            Competitor Rankings
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 dark:text-slate-400">
                        Overall performance comparison
                    </p>
                </div>

            </header>

            {/* Main Content */}
            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">

                {/* Back Button */}
                <div>
                    <Link
                        to="/competitors"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-colors shadow-sm"
                    >
                        <ArrowLeft size={16} className="text-gray-400 dark:text-slate-500" />
                        Back to Competitors
                    </Link>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Your Current Rank */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Your Current Rank</p>
                        <h2 className="text-[44px] leading-none font-bold text-[#3b82f6] dark:text-blue-400">#{yourRank}</h2>
                    </div>

                    {/* Card 2: Total Competitors */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Total Competitors</p>
                        <h2 className="text-[44px] leading-none font-bold text-gray-900 dark:text-white">{sorted.length}</h2>
                    </div>

                    {/* Card 3: Top Performer */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Top Performer</p>
                        <div className="mt-1">
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">{topPerformer?.name ?? '—'}</h3>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{topPerformer?.rating ?? 0}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-500">Loading rankings...</span>
                    </div>
                ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8">

                    {/* Card Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rankings Overview</h2>
                        <div className="relative" ref={sortMenuRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortMenuOpen((open) => !open)}
                                className={`flex min-w-[170px] items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors shadow-sm ${isSortMenuOpen ? 'border-blue-300 dark:border-blue-500 bg-blue-50/60 dark:bg-slate-700' : 'border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                {activeSortLabel}
                                <ChevronDown size={16} className={`text-gray-400 dark:text-slate-500 transition-transform ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSortMenuOpen && (
                                <div className="absolute right-0 top-full z-20 mt-2 w-[200px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                    {SORT_OPTIONS.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            onClick={() => handleSort(option.key)}
                                            className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${sortBy === option.key ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700/70'}`}
                                        >
                                            <span>{option.label}</span>
                                            {sortBy === option.key && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[10%]">Rank</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[30%]">Organization Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <button type="button" onClick={() => handleSort('rating')} className={`flex items-center gap-1.5 transition-colors ${sortBy === 'rating' ? 'text-blue-600 dark:text-blue-400' : 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Average Rating
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <button type="button" onClick={() => handleSort('sentiment')} className={`flex items-center gap-1.5 transition-colors ${sortBy === 'sentiment' ? 'text-blue-600 dark:text-blue-400' : 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Sentiment Score
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <button type="button" onClick={() => handleSort('reviews')} className={`flex items-center gap-1.5 transition-colors ${sortBy === 'reviews' ? 'text-blue-600 dark:text-blue-400' : 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-200'}`}>
                                            Review Count
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {sorted.map((competitor) => (
                                    <tr
                                        key={competitor.rank}
                                        className={`transition-colors ${competitor.isYou ? 'bg-blue-50/60 hover:bg-blue-50/80 dark:bg-blue-900/20 dark:hover:bg-blue-900/40' : 'hover:bg-gray-50/30 dark:hover:bg-slate-700/50'}`}
                                    >
                                        <td className="px-6 py-[22px]">
                                            <span className="font-medium text-gray-500 dark:text-slate-400 text-[14px]">#{competitor.rank}</span>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold text-gray-900 dark:text-white text-[14px]">{competitor.name}</span>
                                                {competitor.isYou && (
                                                    <span className="px-2 py-0.5 bg-[#4e80ee] text-white text-[11px] font-bold rounded-md uppercase tracking-wider">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-[22px] flex items-center gap-1.5">
                                            <span className="font-bold text-gray-900 dark:text-white text-[14px]">{competitor.rating}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </td>
                                        <td className="px-6 py-[22px]">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 text-[14px]">{competitor.sentiment}%</span>
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
                )}

            </main>
        </div>
    );
};

export default CompetitorRankingsPage;
