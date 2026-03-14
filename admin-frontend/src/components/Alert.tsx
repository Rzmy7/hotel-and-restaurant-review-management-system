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
                return 'bg-green-50 border-green-200 text-green-600';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-600';
            case 'warning':
                return 'bg-yellow-50 border-yellow-200 text-yellow-600';
            case 'info':
                return 'bg-blue-50 border-blue-200 text-blue-600';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-600';
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
