import React, { useState } from 'react';
import { X, Link, Building2, Globe } from 'lucide-react';
import { addCompetitor } from '../../services/competitorService';

const PLATFORMS = [
  { id: 2, name: 'Booking.com', placeholder: 'https://www.booking.com/hotel/...' },
  { id: 3, name: 'Agoda', placeholder: 'https://www.agoda.com/...' },
];

const ORG_TYPES = [
  { id: 1, name: 'Hotel / Resort' },
  { id: 2, name: 'Restaurant / Cafe' },
];

interface AddCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddCompetitorModal: React.FC<AddCompetitorModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [platformId, setPlatformId] = useState(2);
  const [orgTypeId, setOrgTypeId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPlatform = PLATFORMS.find(p => p.id === platformId) ?? PLATFORMS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sourceUrl.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await addCompetitor(name.trim(), sourceUrl.trim(), platformId, orgTypeId);
      const status = res.competitor?.status;
      if (status === 'Active') {
        setSuccess(`✓ "${res.competitor.name}" found in system — comparison data is ready!`);
      } else {
        setSuccess(`✓ "${res.competitor.name}" added! Reviews are being fetched in the background.`);
      }
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 2000);
    } catch (err: any) {
      setError(err.message ?? 'Failed to register competitor.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(''); setSourceUrl(''); setPlatformId(2); setOrgTypeId(1);
    setError(null); setSuccess(null);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">Add Competitor</h2>
            <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">
              Enter a competitor's details. If their reviews are already in our system, comparison starts immediately.
            </p>
          </div>
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Building2 size={14} className="inline mr-1.5" />
              Competitor Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Grand Ocean Hotel"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Platform + Org Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <Globe size={14} className="inline mr-1.5" />
                Platform
              </label>
              <select
                value={platformId}
                onChange={e => setPlatformId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Type
              </label>
              <select
                value={orgTypeId}
                onChange={e => setOrgTypeId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ORG_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <Link size={14} className="inline mr-1.5" />
              {selectedPlatform.name} Page URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              placeholder={selectedPlatform.placeholder}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1.5">
              If this organization is already tracked in the system, comparison data will appear immediately.
            </p>
          </div>

          {/* Status messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-400 rounded-lg px-4 py-2.5 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { onClose(); resetForm(); }}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              {loading ? 'Checking...' : 'Add Competitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompetitorModal;
