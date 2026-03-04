import React from 'react';

export interface SectionHeaderProps {
    title: string;
    subtitle: string;
    icon?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    iconClassName?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    subtitle,
    icon,
    children,
    className = '',
    iconClassName = ''
}) => {
    return (
        <div className={`flex justify-between items-start ${className}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${iconClassName}`}>
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="m-0 text-sm font-black text-gray-700 uppercase tracking-widest">{title}</h3>
                    <p className="m-0 text-[10px] text-gray-400 font-bold uppercase tracking-wider">{subtitle}</p>
                </div>
            </div>
            {children && <div className="flex">{children}</div>}
        </div>
    );
};
