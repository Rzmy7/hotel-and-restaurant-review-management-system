import React from 'react';
import { X, LogOut } from 'lucide-react';

/**
 * Props for the LogoutConfirmationModal component.
 */
interface LogoutConfirmationModalProps {
    /** Whether the modal is currently visible. */
    isOpen: boolean;
    /** Function to call when the modal is closed or cancelled. */
    onClose: () => void;
    /** Function to call when the user confirms the logout action. */
    onConfirm: () => void;
}

/**
 * A visually consistent confirmation modal for the logout action.
 * Provides a warning before the user is redirected and their session is cleared.
 */
const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

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
                            <div className="w-10 h-10 bg-red-50 dark:bg-red-900/40 rounded-xl grid place-items-center">
                                <LogOut size={20} className="text-red-500 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    Logout
                                </h2>
                                <p className="text-[11px] text-gray-400 dark:text-slate-400 font-semibold uppercase tracking-wider">
                                    Confirm Session Termination
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
                    <div className="p-6 space-y-4">
                        <p className="text-sm font-semibold text-gray-600 dark:text-slate-300 leading-relaxed">
                            Are you sure you want to log out? You will need to sign in again to access your dashboard.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-5 py-2.5 text-sm font-black text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-lg shadow-red-100 dark:shadow-none uppercase tracking-wider"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LogoutConfirmationModal;
