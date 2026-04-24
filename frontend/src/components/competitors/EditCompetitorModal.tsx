import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin } from 'lucide-react';
import { editCompetitor, type Competitor } from '../../services/competitorService';
import { useOrganizationStore } from '../../stores/useOrganizationStore';

interface EditCompetitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  competitor: Competitor | null;
}

const EditCompetitorModal: React.FC<EditCompetitorModalProps> = ({ isOpen, onClose, onSuccess, competitor }) => {
  const [name, setName] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const organizationId = currentOrg?.id;

  useEffect(() => {
    if (competitor) {
      setName(competitor.name);
      setLocationUrl(competitor.location_url || '');
      setError(null);
    }
  }, [competitor, isOpen]);

  if (!isOpen || !competitor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (!organizationId) {
      setError('No active organization selected.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await editCompetitor(organizationId, competitor.id, {
        name: name.trim(),
        location_url: locationUrl.trim(),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Failed to edit competitor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">Edit Competitor</h2>
            <p className="text-sm text-gray-400 dark:text-slate-400 mt-1">
              Update the organization details for this tracked competitor.
            </p>
          </div>
          <button
            onClick={onClose}
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

          {/* Location URL */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin size={14} className="inline mr-1.5" />
              Google Maps Location Link
            </label>
            <input
              type="url"
              value={locationUrl}
              onChange={e => setLocationUrl(e.target.value)}
              placeholder="https://www.google.com/maps/place/..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Status messages */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg px-4 py-2.5 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCompetitorModal;
