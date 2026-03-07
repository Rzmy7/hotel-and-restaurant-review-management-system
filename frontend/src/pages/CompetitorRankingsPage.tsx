import { ChevronDown, ArrowLeft, ArrowUpDown, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchRankings, type RankingEntry } from '../api/competitorApi';

type SortKey = 'rating' | 'sentiment' | 'reviews';

const CompetitorRankingsPage = () => {
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<SortKey>('rating');

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

    const handleSort = (key: SortKey) => {
        setSortBy(key);
    };

    return (
        <div className="min-h-full bg-gray-50 flex flex-col font-sans">
            {/* Header Section */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <button className="text-gray-600 hover:text-black transition-colors" aria-label="Menu">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                            Competitor Rankings
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 pl-9">
                        Overall performance comparison
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm min-w-[140px]">
                        Last 30 Days
                        <ChevronDown size={16} className="text-gray-400" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">

                {/* Back Button */}
                <div>
                    <Link
                        to="/competitors"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
                    >
                        <ArrowLeft size={16} className="text-gray-400" />
                        Back to Competitors
                    </Link>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 size={28} className="animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-500">Loading rankings...</span>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Current Rank</p>
                                <h2 className="text-[44px] leading-none font-bold text-[#3b82f6]">#{yourRank}</h2>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Competitors</p>
                                <h2 className="text-[44px] leading-none font-bold text-gray-900">{sorted.length}</h2>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Top Performer</p>
                                {topPerformer ? (
                                    <div className="mt-1">
                                        <h3 className="text-[20px] font-bold text-gray-900 mb-2">{topPerformer.name}</h3>
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-gray-700 text-sm">{topPerformer.rating}</span>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 text-sm">No data</p>
                                )}
                            </div>
                        </div>

                        {/* Rankings Overview Card */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-8">

                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                                <h2 className="text-lg font-bold text-gray-900">Rankings Overview</h2>
                                <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors shadow-sm capitalize">
                                    {sortBy === 'rating' ? 'Average Rating' : sortBy === 'sentiment' ? 'Sentiment Score' : 'Review Count'}
                                </button>
                            </div>

                            {sorted.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">No rankings data available</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white border-b border-gray-100">
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[10%]">Rank</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[30%]">Organization Name</th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[20%]">
                                                    <div
                                                        className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 transition-colors"
                                                        onClick={() => handleSort('rating')}
                                                    >
                                                        Average Rating
                                                        <ArrowUpDown size={12} className={sortBy === 'rating' ? 'text-blue-500' : 'text-gray-300'} />
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[20%]">
                                                    <div
                                                        className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 transition-colors"
                                                        onClick={() => handleSort('sentiment')}
                                                    >
                                                        Sentiment Score
                                                        <ArrowUpDown size={12} className={sortBy === 'sentiment' ? 'text-blue-500' : 'text-gray-300'} />
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest w-[20%]">
                                                    <div
                                                        className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 transition-colors"
                                                        onClick={() => handleSort('reviews')}
                                                    >
                                                        Review Count
                                                        <ArrowUpDown size={12} className={sortBy === 'reviews' ? 'text-blue-500' : 'text-gray-300'} />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {sorted.map((competitor) => (
                                                <tr
                                                    key={competitor.name}
                                                    className={`transition-colors ${competitor.isYou ? 'bg-blue-50/60 hover:bg-blue-50/80' : 'hover:bg-gray-50/30'}`}
                                                >
                                                    <td className="px-6 py-[22px]">
                                                        <span className="font-medium text-gray-500 text-[14px]">#{competitor.rank}</span>
                                                    </td>
                                                    <td className="px-6 py-[22px]">
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-semibold text-gray-900 text-[14px]">{competitor.name}</span>
                                                            {competitor.isYou && (
                                                                <span className="px-2 py-0.5 bg-[#4e80ee] text-white text-[11px] font-bold rounded-md uppercase tracking-wider">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-[22px]">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-gray-900 text-[14px]">{competitor.rating}</span>
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                                            </svg>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-[22px]">
                                                        <span className="font-medium text-gray-700 text-[14px]">{competitor.sentiment}%</span>
                                                    </td>
                                                    <td className="px-6 py-[22px]">
                                                        <span className="text-gray-500 text-[14px]">{competitor.reviews.toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}

            </main>
        </div>
    );
};

export default CompetitorRankingsPage;
