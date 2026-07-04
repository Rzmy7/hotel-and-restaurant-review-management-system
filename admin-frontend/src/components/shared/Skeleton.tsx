import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
    return (
        <div
            className={`animate-shimmer bg-gray-200/60 dark:bg-slate-800 ${className}`}
            role="status"
            aria-busy="true"
            aria-live="polite"
            {...props}
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};

export default Skeleton;
export { Skeleton };
