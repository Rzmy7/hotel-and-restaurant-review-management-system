import React, { useState, useEffect } from 'react';
import { Star, Loader2, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface AvailableCompetitor {
  id: number;
  name: string;
  location: string;
  avgRating: number;
  status: string;
}

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCompetitor: (competitorId: number) => Promise<void> | void;
}

const AddCompetitorModal: React.FC<AddCompetitorModalProps> = ({
  isOpen,
  onClose,
  onAddCompetitor,
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

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-[640px] overflow-hidden">

        <div className="px-8 pb-6 pt-6 max-h-[440px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="ml-3 text-sm text-gray-500">Loading...</span>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-600 text-sm">{error}</p>
              <button onClick={handleRetry} className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 transition-colors">
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && competitors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">No competitors available</p>
              <p className="text-gray-400 text-xs mt-1">All competitors are already being tracked</p>
            </div>
          )}

          {!loading && !error && competitors.length > 0 && (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-4 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Competitor Name</th>
                  <th className="pb-4 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                  <th className="pb-4 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Avg Rating</th>
                  <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((competitor, index) => (
                  <tr key={competitor.id} className={index < competitors.length - 1 ? 'border-b border-gray-100' : ''}>
                    <td className="py-5 pr-6 text-sm font-medium text-gray-900 whitespace-nowrap">{competitor.name}</td>
                    <td className="py-5 pr-6 text-sm text-gray-500 whitespace-nowrap">{competitor.location}</td>
                    <td className="py-5 pr-6 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium text-gray-800">{competitor.avgRating > 0 ? competitor.avgRating.toFixed(1) : 'N/A'}</span>
                        <Star size={14} fill="#fbbf24" color="#fbbf24" />
                      </span>
                    </td>
                    <td className="py-5">
                      <button
                        onClick={() => handleAdd(competitor.id)}
                        disabled={trackingId !== null}
                        className="text-blue-600 hover:text-blue-800 text-sm font-semibold disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      >
                        {trackingId === competitor.id ? (
                          <><Loader2 size={14} className="animate-spin" /> Adding...</>
                        ) : (
                          'ADD'
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-8 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCompetitorModal;
