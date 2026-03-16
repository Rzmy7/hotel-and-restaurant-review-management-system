import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { inferCompetitorDomain, type CompetitorDomain } from '../utils/competitorDomain';

const API_BASE = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL || 'http://localhost:8000';

interface AvailableCompetitor {
  id: number;
  name: string;
  location: string;
  avgRating: number;
  status: string;
  bookingUrl?: string;
}

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompetitor: (competitorId: number) => Promise<void> | void;
  selectedDomain: CompetitorDomain;
}

const AddCompetitorModal: React.FC<AddCompetitorModalProps> = ({
  isOpen,
  onClose,
  onAddCompetitor,
  selectedDomain,
}) => {
  const [competitors, setCompetitors] = useState<AvailableCompetitor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadAvailable = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_BASE + '/competitors');
        if (!res.ok) throw new Error('API error ' + res.status);
        const data = await res.json();
        if (!cancelled) setCompetitors(data.available ?? []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load competitors');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAvailable();
    return () => { cancelled = true; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (competitorId: number) => {
    setTrackingId(competitorId);
    try {
      await onAddCompetitor(competitorId);
      setCompetitors(prev => prev.filter(c => c.id !== competitorId));
    } catch {
      // error handled by parent
    } finally {
      setTrackingId(null);
    }
  };

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE + '/competitors');
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      setCompetitors(data.available ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load competitors');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompetitors = competitors.filter((competitor) => inferCompetitorDomain(competitor) === selectedDomain);

    return (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* Modal Container */}
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="px-8 py-6 flex items-start justify-between border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">Competitors</h2>
                        <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">Available {selectedDomain === 'Hotel' ? 'hotel' : 'restaurant'} competitors</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* List Section */}
                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-blue-500" />
                            <span className="ml-2 text-gray-400 text-sm">Loading competitors...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <p className="text-red-500 text-sm">{error}</p>
                            <button onClick={handleRetry} className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 text-sm font-medium">
                                <RefreshCw size={14} /> Retry
                            </button>
                        </div>
                    ) : (
                    filteredCompetitors.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-400 dark:text-slate-500">
                      No available {selectedDomain === 'Hotel' ? 'hotel' : 'restaurant'} competitors found.
                    </div>
                    ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100/60 dark:border-slate-700/60 sticky top-0 bg-white dark:bg-slate-800 z-10 flex w-full">
                                <th className="py-4 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[40%]">Competitor Name</th>
                                <th className="py-4 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[25%] flex-1">Location</th>
                                <th className="py-4 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[20%] flex-1">Avg Rating</th>
                                <th className="py-4 text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest w-[15%] text-center flex-1">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50/80 dark:divide-slate-700/80 flex flex-col w-full">
                          {filteredCompetitors.map((competitor) => (
                                <tr key={competitor.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-700/40 transition-colors flex w-full items-center">
                                    <td className="py-[18px] w-[40%]">
                                        <span className="font-semibold text-gray-800 dark:text-gray-200 text-[14px]">{competitor.name}</span>
                                    </td>
                                    <td className="py-[18px] flex-1">
                                        <span className="text-gray-500 dark:text-slate-400 text-[14px]">{competitor.location}</span>
                                    </td>
                                    <td className="py-[18px] flex items-center gap-1.5 h-[60px] flex-1">
                                        <span className="font-bold text-gray-900 dark:text-white text-[14px]">{competitor.avgRating}</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    </td>
                                    <td className="py-[18px] text-center flex-1">
                                        <button
                                            onClick={() => handleAdd(competitor.id)}
                                            disabled={trackingId === competitor.id}
                                            className="bg-[#4e80ee] hover:bg-blue-600 disabled:bg-gray-300 text-white px-5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all hover:shadow-md active:scale-95 uppercase tracking-wide"
                                        >
                                            {trackingId === competitor.id ? 'Adding...' : 'Add'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                      )
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddCompetitorModal;
