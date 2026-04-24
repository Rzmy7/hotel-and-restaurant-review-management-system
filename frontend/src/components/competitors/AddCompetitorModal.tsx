import React, { useState } from 'react';
import { X, Link as LinkIcon, Building2, MapPin } from 'lucide-react';
import { addCompetitor, type CompetitorSourceInput } from '../../services/competitorService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

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
  const [orgTypeId, setOrgTypeId] = useState(1);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const organizationId = currentOrg?.id;

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setOrgTypeId(1);
    setCity('');
    setCountry('');
    setUrls({});
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !city.trim() || !country.trim()) {
      setError('Name, city, and country are required.');
      return;
    }

    if (!organizationId) {
      setError('No active organization selected.');
      return;
    }

    const sources: CompetitorSourceInput[] = PLATFORMS
      .map(p => ({ platform_id: p.id, source_url: (urls[p.id] || '').trim() }))
      .filter(s => s.source_url.length > 0);

    if (sources.length === 0) {
      setError('Enter at least one platform URL.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await addCompetitor(organizationId, {
        name: name.trim(),
        organization_type_id: orgTypeId,
        city: city.trim(),
        country: country.trim(),
        sources,
      });
      const status = res.competitor?.status;
      if (status === 'Active') {
        setSuccess(`"${res.competitor.name}" is already in the system — comparison data is ready.`);
      } else {
        setSuccess(`"${res.competitor.name}" added. Reviews are being scraped in the background.`);
      }
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 1800);
    } catch (err: any) {
      setError(err.message ?? 'Failed to register competitor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">Add Competitor</h2>
            <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">
              Add a competitor as an organization. If any URL is already in the system, we'll link to it.
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

          {/* Type */}
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

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <MapPin size={14} className="inline mr-1.5" />
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Colombo"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Country
              </label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Sri Lanka"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Platform URL inputs */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              <LinkIcon size={14} className="inline mr-1.5" />
              Platform URLs <span className="font-normal text-gray-400">(at least one)</span>
            </label>
            {PLATFORMS.map(p => (
              <div key={p.id}>
                <div className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">{p.name}</div>
                <input
                  type="url"
                  value={urls[p.id] || ''}
                  onChange={e => setUrls(prev => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder={p.placeholder}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            ))}
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
              {loading ? 'Adding…' : 'Add Competitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCompetitorModal;
