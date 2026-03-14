import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: number;
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 40, className = '' }) => {
    return (
        <div className={`flex items-center justify-center h-[50vh] ${className}`}>
            <Loader className="animate-spin text-blue-500" size={size} />
        </div>
    );
};
