import React from 'react';
import { Button } from '../../ui/Button';

interface SettingsTemplateProps {
    children: React.ReactNode;
    isSaving: boolean;
    onSave: () => void;
    onCancel: () => void;
    hasUnsavedChanges?: boolean;
}

export const SettingsTemplate: React.FC<SettingsTemplateProps> = ({
    children,
    isSaving,
    onSave,
    onCancel,
    hasUnsavedChanges
}) => {
    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col relative pb-24 transition-colors duration-300">
            {/* Header aligned correctly, reusing existing component style */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
                        Settings & Preferences
                    </h1>
                    <p className="mt-0.5 text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                        Manage your account and billing information
                    </p>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-8 py-6">
                {children}
            </main>

            {/* Sticky Action Footer */}
            <div className="fixed bottom-0 right-0 left-0 lg:left-[280px] z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-gray-200 dark:border-slate-800 px-8 py-4 flex gap-4 justify-end shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-none transition-all duration-300">
                <Button
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel Changes
                </Button>
                <Button
                    variant="primary"
                    onClick={onSave}
                    isLoading={isSaving}
                    disabled={hasUnsavedChanges === false}
                >
                    Save Details
                </Button>
            </div>
        </div>
    );
};
