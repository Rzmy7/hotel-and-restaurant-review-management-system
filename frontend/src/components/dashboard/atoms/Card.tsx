import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    hoverEffect?: boolean;
    colorScheme?: 'blue' | 'amber' | 'indigo' | 'rose' | 'emerald';
}

export const Card: React.FC<CardProps> = ({
    children,
    hoverEffect = false,
    colorScheme = 'blue',
    className = '',
    ...props
}) => {
    const borderSchemes = {
        blue: 'hover:border-blue-200',
        amber: 'hover:border-amber-200',
        indigo: 'hover:border-indigo-200',
        rose: 'hover:border-rose-200',
        emerald: 'hover:border-emerald-200',
    };

    const hoverClasses = hoverEffect
        ? `transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/40 hover:-translate-y-0.5 group ${borderSchemes[colorScheme]}`
        : '';

    return (
        <div
            className={`p-4 bg-white border border-gray-100 rounded-xl relative overflow-hidden ${hoverClasses} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};
