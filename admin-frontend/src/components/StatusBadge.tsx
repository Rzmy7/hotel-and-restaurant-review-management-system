import React from 'react';

interface StatusBadgeProps {
    status: 'Online' | 'Offline' | 'Warning' | 'Running' | 'Completed' | 'Failed' | 'Active' | 'Enabled' | 'Disabled';
    showDot?: boolean;
    className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, showDot = false, className = '' }) => {
    const getStatusStyle = () => {
        switch (status) {
            case 'Online':
            case 'Active':
            case 'Enabled':
            case 'Completed':
                return {
                    bg: 'bg-green-100 dark:bg-green-900/30',
                    text: 'text-green-700 dark:text-green-400',
                    border: 'border-green-200 dark:border-green-800',
                    dot: 'bg-green-500'
                };
            case 'Offline':
            case 'Failed':
            case 'Disabled':
                return {
                    bg: 'bg-red-100 dark:bg-red-900/30',
                    text: 'text-red-700 dark:text-red-400',
                    border: 'border-red-200 dark:border-red-800',
                    dot: 'bg-red-500'
                };
            case 'Warning':
                return {
                    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    text: 'text-yellow-700 dark:text-yellow-400',
                    border: 'border-yellow-200 dark:border-yellow-800',
                    dot: 'bg-yellow-500'
                };
            case 'Running':
                return {
                    bg: 'bg-blue-100 dark:bg-blue-900/30',
                    text: 'text-blue-700 dark:text-blue-400',
                    border: 'border-blue-200 dark:border-blue-800',
                    dot: 'bg-blue-500'
                };
            default:
                return {
                    bg: 'bg-gray-100 dark:bg-slate-700',
                    text: 'text-gray-700 dark:text-slate-400',
                    border: 'border-gray-200 dark:border-slate-600',
                    dot: 'bg-gray-50 dark:bg-slate-9000'
                };
        }
    };

    const styles = getStatusStyle();

    return (
        <div className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 w-fit ${styles.bg} ${styles.text} ${styles.border} ${className}`}>
            {showDot && <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`}></span>}
            {status}
        </div>
    );
};
