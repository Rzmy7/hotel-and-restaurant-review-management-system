import React from 'react';

interface AlertProps {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    onClose?: () => void;
    className?: string;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose, className = '' }) => {
    const getAlertStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-600 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400';
            default:
                return 'bg-gray-50 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400';
        }
    };

    return (
        <div className={`border rounded-lg p-4 flex items-center justify-between ${getAlertStyles()} ${className}`}>
            <p className="text-sm">{message}</p>
            {onClose && (
                <button
                    onClick={onClose}
                    className="ml-4 text-current opacity-70 hover:opacity-100 transition-opacity"
                >
                    ×
                </button>
            )}
        </div>
    );
};
