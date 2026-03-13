import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface ChangeDetail {
    tab: string;
    field: string;
    oldValue: any;
    newValue: any;
}

interface UnsavedChangesModalProps {
    isOpen: boolean;
    changes: ChangeDetail[];
    onClose: () => void;
    onDiscard: () => void;
    onSave: () => void;
    isSaving?: boolean;
    title?: string;
    description?: string;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
    isOpen,
    changes,
    onClose,
    onDiscard,
    onSave,
    isSaving = false,
    title = "Review Unsaved Changes",
    description = "You have unsaved changes. Please review them before continuing."
}) => {
    if (!isOpen) return null;

    // Group changes by tab
    const groupedChanges = changes.reduce((acc, change) => {
        if (!acc[change.tab]) acc[change.tab] = [];
        acc[change.tab].push(change);
        return acc;
    }, {} as Record<string, ChangeDetail[]>);

    const formatValue = (val: any) => {
        if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
        if (val === null || val === undefined || val === '') return 'None';
        return String(val);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 dark:bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700/50 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 mt-1">
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{title}</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{description}</p>
                    </div>
                </div>

                {/* Body (Scrollable) */}
                <div className="px-6 py-4 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-slate-900/20">
                    {Object.entries(groupedChanges).length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">No changes detected.</div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(groupedChanges).map(([tab, tabChanges]) => (
                                <div key={tab}>
                                    <h3 className="text-[11px] font-black tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-3">{tab}</h3>
                                    <div className="space-y-2">
                                        {tabChanges.map((change, idx) => (
                                            <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-1.5">
                                                <div className="text-[13px] font-bold text-gray-700 dark:text-gray-300">
                                                    {change.field}
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <span className="text-gray-400 dark:text-slate-500 bg-gray-50 flex-1 dark:bg-slate-900 px-2 py-1 rounded line-through decoration-red-400/50 truncate" title={formatValue(change.oldValue)}>
                                                        {formatValue(change.oldValue)}
                                                    </span>
                                                    <ArrowRight size={14} className="text-gray-300 dark:text-slate-600 shrink-0" />
                                                    <span className="text-blue-600 dark:text-blue-400 bg-blue-50 flex-1 dark:bg-blue-900/20 px-2 py-1 rounded font-medium truncate" title={formatValue(change.newValue)}>
                                                        {formatValue(change.newValue)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 flex justify-between gap-4">
                    <Button variant="danger" onClick={onDiscard} disabled={isSaving}>Discard Changes</Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose} disabled={isSaving}>Continue Editing</Button>
                        <Button variant="primary" onClick={onSave} isLoading={isSaving} disabled={Object.keys(groupedChanges).length === 0}>Save Details</Button>
                    </div>
                </div>

            </div>
        </div>
    );
};
