import React from 'react';
import { X, ArrowRight, Save, Trash2 } from 'lucide-react';
import type { UserProfile } from '../../../pages/ProfilePage';

interface UnsavedChangesModalProps {
  /** The original saved profile (before any edits) */
  savedProfile: UserProfile;
  /** The current dirty profile */
  currentProfile: UserProfile;
  onDiscard: () => void;
  onContinueEditing: () => void;
  onSave: () => void;
  isSaving: boolean;
}

/** Returns a human-readable label for each profile field key */
const FIELD_LABELS: Partial<Record<keyof UserProfile, string>> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phone: 'Phone',
  jobTitle: 'Job Title',
  bio: 'Bio',
  location: 'Location',
};

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  savedProfile,
  currentProfile,
  onDiscard,
  onContinueEditing,
  onSave,
  isSaving,
}) => {
  // Collect which fields have changed
  const changedFields = (Object.keys(FIELD_LABELS) as (keyof UserProfile)[]).filter(
    key => (savedProfile[key] ?? '') !== (currentProfile[key] ?? '')
  );

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onContinueEditing}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-[520px] bg-[#1a1f2e] dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-slate-700/50 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Review Unsaved Changes</h2>
            <p className="text-sm text-slate-400 mt-1">
              You have unsaved changes. Please review them before continuing.
            </p>
          </div>
          <button
            onClick={onContinueEditing}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Changed fields */}
        <div className="px-7 py-6">
          {changedFields.length > 0 ? (
            <>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">
                General Properties
              </p>
              <div className="space-y-3">
                {changedFields.map(key => (
                  <div
                    key={key}
                    className="bg-[#151922] rounded-xl border border-slate-700/50 px-5 py-4"
                  >
                    <p className="text-xs font-bold text-slate-300 mb-3">
                      {FIELD_LABELS[key]}
                    </p>
                    <div className="flex items-center gap-3">
                      {/* Old value */}
                      <div className="flex-1 px-3 py-2 rounded-lg bg-[#1e2333] border border-slate-700/40">
                        <p className="text-sm text-slate-400 truncate line-through decoration-slate-500/50">
                          {String(savedProfile[key] || '—')}
                        </p>
                      </div>
                      {/* Arrow */}
                      <ArrowRight size={16} className="text-blue-400 shrink-0" />
                      {/* New value */}
                      <div className="flex-1 px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30">
                        <p className="text-sm text-blue-300 font-semibold truncate">
                          {String(currentProfile[key] || '—')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">
              No text field changes detected.
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-7 py-5 border-t border-slate-700/50 flex items-center justify-between gap-4">
          {/* Discard */}
          <button
            onClick={onDiscard}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/60 text-red-400 hover:bg-red-500/10 font-semibold text-sm transition-colors"
          >
            <Trash2 size={14} />
            Discard Changes
          </button>

          {/* Continue Editing */}
          <button
            onClick={onContinueEditing}
            className="px-5 py-2.5 rounded-xl text-slate-300 hover:text-white font-semibold text-sm transition-colors"
          >
            Continue Editing
          </button>

          {/* Save Details */}
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm transition-colors shadow-lg shadow-blue-900/30"
          >
            {isSaving ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedChangesModal;
