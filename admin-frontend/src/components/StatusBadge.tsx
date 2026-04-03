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
                    bg: 'bg-green-100',
                    text: 'text-green-700',
                    border: 'border-green-200',
                    dot: 'bg-green-500'
                };
            case 'Offline':
            case 'Failed':
            case 'Disabled':
                return {
                    bg: 'bg-red-100',
                    text: 'text-red-700',
                    border: 'border-red-200',
                    dot: 'bg-red-500'
                };
            case 'Warning':
                return {
                    bg: 'bg-yellow-100',
                    text: 'text-yellow-700',
                    border: 'border-yellow-200',
                    dot: 'bg-yellow-500'
                };
            case 'Running':
                return {
                    bg: 'bg-blue-100',
                    text: 'text-blue-700',
                    border: 'border-blue-200',
                    dot: 'bg-blue-500'
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-700',
                    border: 'border-gray-200',
                    dot: 'bg-gray-500'
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
