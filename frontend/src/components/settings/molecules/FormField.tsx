import React from 'react';

interface FormFieldProps {
    label: string;
    description?: string;
    children: React.ReactNode;
    orientation?: 'horizontal' | 'vertical';
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    description,
    children,
    orientation = 'vertical'
}) => {
    if (orientation === 'horizontal') {
        return (
            <div className="flex items-center justify-between py-5 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 max-md:flex-col max-md:items-start max-md:gap-3 group">
                <div className="flex-1 pr-4">
                    <label className="text-[13px] font-black tracking-tight text-gray-700 dark:text-gray-300 uppercase group-hover:text-blue-600 transition-colors">{label}</label>
                    {description && <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wider">{description}</p>}
                </div>
                <div className="w-auto min-w-[240px] max-md:w-full">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 py-4 border-b border-gray-100 dark:border-slate-700/50 last:border-b-0 group">
            <label className="text-[13px] font-black tracking-tight text-gray-700 dark:text-gray-300 uppercase group-hover:text-blue-600 transition-colors">{label}</label>
            <div className="w-full max-w-[400px] max-md:max-w-full">
                {children}
            </div>
            {description && <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{description}</p>}
        </div>
    );
};
