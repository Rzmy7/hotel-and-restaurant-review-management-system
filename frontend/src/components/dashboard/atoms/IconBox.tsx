import React from 'react';

export interface IconBoxProps {
    icon: React.ReactNode;
    colorScheme?: 'blue' | 'amber' | 'indigo' | 'rose' | 'emerald';
    className?: string;
}

export const IconBox: React.FC<IconBoxProps> = ({
    icon,
    colorScheme = 'blue',
    className = ''
}) => {
    const schemes = {
        blue: { bg: 'bg-blue-50', icon: 'text-[#4e80ee]' },
        amber: { bg: 'bg-amber-50', icon: 'text-amber-600' },
        indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600' },
        rose: { bg: 'bg-rose-50', icon: 'text-rose-600' },
        emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600' }
    };

    const scheme = schemes[colorScheme];

    return (
        <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${scheme.bg} ${scheme.icon} transition-transform duration-300 group-hover:scale-105 ${className}`}>
            {icon}
        </div>
    );
};
