import React from 'react';
import { Toggle } from '../../ui/Toggle';

interface ToggleRowProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onChange }) => {
    return (
        <div className="flex items-center justify-start gap-8 py-5 border-b border-gray-100 last:border-b-0 max-md:flex-col max-md:items-start max-md:gap-3 group">
            <div className="w-[280px] shrink-0 pr-4">
                <label className="text-[13px] font-black tracking-tight text-gray-700 dark:text-gray-300 uppercase group-hover:text-blue-600 transition-colors">{label}</label>
                {description && <p className="text-xs text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase tracking-wider">{description}</p>}
            </div>
            <div className="flex-1 w-full max-md:max-w-full flex items-center">
                <Toggle checked={checked} onChange={onChange} />
            </div>
        </div>
    );
};
