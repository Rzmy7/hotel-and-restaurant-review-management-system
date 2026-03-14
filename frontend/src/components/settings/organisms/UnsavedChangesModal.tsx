import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';

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

    const footer = (
        <div className="flex justify-between items-center w-full gap-4">
            <Button 
                onClick={onDiscard} 
                disabled={isSaving}
                variant="outline"
                className="text-rose-500 border-rose-200 hover:bg-rose-50/50 hover:border-rose-300 hover:text-rose-600 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/40 active:scale-95 transition-all shadow-sm hover:shadow"
            >
                Discard Changes
            </Button>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} disabled={isSaving}>Continue Editing</Button>
                <Button 
                    variant="primary" 
                    onClick={onSave} 
                    isLoading={isSaving} 
                    disabled={Object.keys(groupedChanges).length === 0}
                    className="shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    Save Details
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            description={description}
            footer={footer}
            size="lg"
        >
            <div className="p-8 bg-gray-50/30 dark:bg-slate-900/20">
                {Object.entries(groupedChanges).length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                           <AlertTriangle size={24} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">No changes detected.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedChanges).map(([tab, tabChanges]) => (
                            <div key={tab}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-px bg-gray-100 dark:bg-slate-700/50 flex-1" />
                                    <h3 className="text-[11px] font-black tracking-widest text-[#4e80ee] dark:text-blue-400 uppercase">{tab}</h3>
                                    <div className="h-px bg-gray-100 dark:bg-slate-700/50 flex-1" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {tabChanges.map((change, idx) => (
                                        <div key={idx} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-3 group hover:border-blue-100 dark:hover:border-blue-900/50 transition-colors">
                                            <div className="text-[13px] font-black text-gray-800 dark:text-gray-200">
                                                {change.field}
                                            </div>
                                            <div className="flex items-center gap-2 text-[12px]">
                                                <div className="flex-1 bg-gray-50 dark:bg-slate-900/50 px-3 py-2 rounded-xl text-gray-400 dark:text-slate-500 font-medium line-through decoration-rose-400/30 truncate" title={formatValue(change.oldValue)}>
                                                    {formatValue(change.oldValue)}
                                                </div>
                                                <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                    <ArrowRight size={12} className="text-blue-500 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-2 rounded-xl text-blue-600 dark:text-blue-400 font-bold truncate border border-blue-50 dark:border-blue-900/30" title={formatValue(change.newValue)}>
                                                    {formatValue(change.newValue)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};
