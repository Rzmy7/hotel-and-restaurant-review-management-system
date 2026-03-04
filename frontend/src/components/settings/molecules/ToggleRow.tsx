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
        <div className="flex items-center justify-between py-5 border-b border-gray-100 last:border-b-0 max-md:flex-col max-md:items-start max-md:gap-3 group">
            <div className="flex-1 pr-4">
                <label className="text-[13px] font-black tracking-tight text-gray-700 uppercase group-hover:text-blue-600 transition-colors">{label}</label>
                {description && <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-wider">{description}</p>}
            </div>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
};
