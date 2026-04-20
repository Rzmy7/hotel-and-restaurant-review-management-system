import React from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    // Styles based on type
    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-50 text-emerald-800 border-emerald-200';
            case 'error':
                return 'bg-red-50 text-red-800 border-red-200';
            case 'warning':
                return 'bg-amber-50 text-amber-800 border-amber-200';
            case 'info':
                return 'bg-blue-50 text-blue-800 border-blue-200';
            default:
                return 'bg-white text-gray-800 border-gray-200';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={18} className="text-emerald-500" />;
            case 'error':
                return <AlertCircle size={18} className="text-red-500" />;
            case 'warning':
                return <AlertTriangle size={18} className="text-amber-500" />;
            case 'info':
                return <Info size={18} className="text-blue-500" />;
        }
    };

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] animate-slide-in-right ${getStyles()}`}>
            {getIcon()}
            <p className="flex-1 text-sm font-medium m-0">{message}</p>
            <button
                onClick={onClose}
                className="p-1 hover:bg-black/5 rounded-full transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center text-inherit opacity-70 hover:opacity-100"
            >
                <X size={16} />
            </button>
        </div>
    );
};
