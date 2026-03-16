import { ChevronDown, TrendingUp, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import AddCompetitorModal from '../components/competitors/AddCompetitorModal';
import {
    fetchCompetitors,
    trackCompetitor,
    untrackCompetitor,
    type Competitor,
} from '../api/competitorApi';
import { DOMAIN_OPTIONS, inferCompetitorDomain, type CompetitorDomain } from '../utils/competitorDomain';

const CompetitorsPage = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [tracked, setTracked] = useState<Competitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDomain, setSelectedDomain] = useState<CompetitorDomain>('Hotel');
    const [isDomainMenuOpen, setIsDomainMenuOpen] = useState(false);
    const domainMenuRef = useRef<HTMLDivElement>(null);

    const loadCompetitors = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchCompetitors();
            setTracked(data.tracked ?? []);
        } catch (err) {
            console.error('[CompetitorsPage] Fetch error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load competitors');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCompetitors();
    }, [loadCompetitors]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (domainMenuRef.current && !domainMenuRef.current.contains(event.target as Node)) {
                setIsDomainMenuOpen(false);
            }
        };

        if (isDomainMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDomainMenuOpen]);

    const handleTrack = async (competitorId: number) => {
        try {
            await trackCompetitor(competitorId);
            await loadCompetitors();
            setIsAddModalOpen(false);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to track competitor');
        }
    };

    const handleUntrack = async (competitorId: number) => {
        if (!confirm('Remove this competitor from your tracked list?')) return;
        try {
            await untrackCompetitor(competitorId);
            await loadCompetitors();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to untrack competitor');
        }
    };

    const filteredTracked = tracked.filter((competitor) => inferCompetitorDomain(competitor) === selectedDomain);

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header Section */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            Competitors
                        </h1>
                    </div>
                    <p className="mt-1 text-sm text-gray-400 dark:text-slate-400">
                        Manage your competitor list
                    </p>
                </div>

                <div className="flex items-center">
                    <div className="relative" ref={domainMenuRef}>
                        <button
                            type="button"
                            onClick={() => setIsDomainMenuOpen((open) => !open)}
                            className={`flex items-center justify-between gap-3 px-4 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors shadow-sm min-w-[156px] ${isDomainMenuOpen ? 'border-blue-300 dark:border-blue-500 bg-blue-50/60 dark:bg-slate-700' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                        >
                            {selectedDomain}
                            <ChevronDown size={16} className={`text-gray-400 dark:text-slate-500 transition-transform ${isDomainMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isDomainMenuOpen && (
                            <div className="absolute right-0 top-full z-20 mt-2 w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                                {DOMAIN_OPTIONS.map((domain) => (
                                    <button
                                        key={domain}
                                        type="button"
                                        onClick={() => {
                                            setSelectedDomain(domain);
                                            setIsDomainMenuOpen(false);
                                        }}
                                        className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors ${selectedDomain === domain ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-slate-700/70'}`}
                                    >
                                        <span>{domain}</span>
                                        {selectedDomain === domain && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto">

                {/* Error State */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Competitor List Card */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">

                    {/* Card Header */}
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Competitor List</h2>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/competitors/rankings"
                                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                            >
                                <TrendingUp size={16} />
                                View Rankings
                            </Link>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
                            >
                                <Plus size={16} />
                                Add Competitor
                            </button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={28} className="animate-spin text-blue-500" />
                            <span className="ml-3 text-gray-500">Loading competitors...</span>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && filteredTracked.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-gray-500 text-lg">No {selectedDomain === 'Hotel' ? 'hotel' : 'restaurant'} competitors tracked yet</p>
                            <p className="text-gray-400 text-sm mt-2">Click "Add Competitor" to start tracking {selectedDomain === 'Hotel' ? 'hotels' : 'restaurants'} from the available pool.</p>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && filteredTracked.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[25%]">Competitor Name</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[20%]">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[15%]">Avg Rating</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[15%]">Sentiment Score</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[15%]">Review Count</th>
                                    <th className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider w-[10%] text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {filteredTracked.map((competitor) => (
                                    <tr key={competitor.id} className="hover:bg-gray-50/30 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <span className="font-semibold text-gray-900 dark:text-white text-[15px]">{competitor.name}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-gray-500 dark:text-gray-400 text-[15px]">{competitor.location}</span>
                                        </td>
                                        <td className="px-6 py-5 flex items-center gap-1">
                                            <span className="font-bold text-gray-900 dark:text-white text-[15px]">{competitor.avgRating}</span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                            </svg>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-gray-700 dark:text-gray-300 font-medium text-[15px]">{competitor.sentimentScore}%</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-gray-500 dark:text-gray-400 text-[15px]">{competitor.reviewCount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-center gap-3">
                                                <Link to={`/competitors/compare?id=${competitor.id}`} className="bg-[#4e80ee] hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-colors">
                                                    Compare
                                                </Link>
                                                <button onClick={() => handleUntrack(competitor.id)} className="text-red-400 hover:text-red-500 p-1.5 transition-colors" aria-label="Remove">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    )}
                </div>

            </main>

            <AddCompetitorModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAddCompetitor={handleTrack}
                selectedDomain={selectedDomain}
            />
        </div>
    );
};

export default CompetitorsPage;
