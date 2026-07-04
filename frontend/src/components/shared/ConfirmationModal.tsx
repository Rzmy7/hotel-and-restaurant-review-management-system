import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            bg: 'bg-rose-50 dark:bg-rose-950/40',
            text: 'text-rose-500 dark:text-rose-400',
            button: 'bg-rose-500 hover:bg-rose-600 shadow-rose-100 dark:shadow-none',
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            text: 'text-amber-500 dark:text-amber-400',
            button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 dark:shadow-none',
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            text: 'text-blue-500 dark:text-blue-400',
            button: 'bg-blue-500 hover:bg-blue-600 shadow-blue-100 dark:shadow-none',
        }
    };

    const currentVariant = variantStyles[variant];

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto transform transition-all animate-in zoom-in-95 fade-in duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${currentVariant.bg} rounded-xl grid place-items-center`}>
                                <AlertTriangle size={20} className={currentVariant.text} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {title}
                                </h2>
                                <p className="text-[10px] text-gray-400 dark:text-slate-400 font-black uppercase tracking-wider">
                                    Action Required
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 leading-relaxed">
                            {description}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-5 py-2.5 text-sm font-black text-white ${currentVariant.button} rounded-lg transition-colors shadow-lg uppercase tracking-wider`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationModal;
