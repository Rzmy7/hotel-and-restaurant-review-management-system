import { ChevronDown, ArrowLeft, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';

// Mock data matching the image
const RANKINGS = [
    {
        rank: 1,
        name: 'Luxury Grand Resort',
        isYou: false,
        rating: 4.7,
        sentiment: 89,
        reviews: 2847,
    },
    {
        rank: 2,
        name: 'Grand Plaza Hotel',
        isYou: true,
        rating: 4.5,
        sentiment: 86,
        reviews: 2234,
    },
    {
        rank: 3,
        name: 'Cinnamon Hotel',
        isYou: false,
        rating: 4.6,
        sentiment: 85,
        reviews: 1654,
    },
    {
        rank: 4,
        name: 'Turtle watch Hotel',
        isYou: false,
        rating: 4.3,
        sentiment: 81,
        reviews: 1432,
    }
];

const CompetitorRankingsPage = () => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header Section */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        {/* Hamburger menu icon from mockup */}
                        <button className="text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors" aria-label="Menu">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 6H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            Competitor Rankings
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 dark:text-slate-400 pl-9">
                        Overall performance comparison
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[160px]">
                        Grand Plaza Hotel
                        <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />
                    </button>
                    <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors shadow-sm min-w-[140px]">
                        Last 30 Days
                        <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />
                    </button>
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
                        <h2 className="text-[44px] leading-none font-bold text-[#3b82f6] dark:text-blue-400">#2</h2>
                    </div>

                    {/* Card 2: Total Competitors */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Total Competitors</p>
                        <h2 className="text-[44px] leading-none font-bold text-gray-900 dark:text-white">5</h2>
                    </div>

                    {/* Card 3: Top Performer */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 flex flex-col justify-center h-[140px]">
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-400 uppercase tracking-wider mb-2">Top Performer</p>
                        <div className="mt-1">
                            <h3 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">Luxury Grand Resort</h3>
                            <div className="flex items-center gap-1">
                                <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">4.7</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rankings Overview Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8">

                    {/* Card Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Rankings Overview</h2>
                        <button className="flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                            Average Rating
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[10%]">Rank</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[30%]">Organization Name</th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                            Average Rating
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                            Sentiment Score
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest w-[20%]">
                                        <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                            Review Count
                                            <ArrowUpDown size={12} className="text-gray-300 dark:text-slate-500" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {RANKINGS.map((competitor) => (
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

            </main>
        </div>
    );
};

export default CompetitorRankingsPage;
