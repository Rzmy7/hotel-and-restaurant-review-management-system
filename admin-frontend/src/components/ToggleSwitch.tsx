import React from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
    checked, 
    onChange, 
    label, 
    disabled = false,
    className = '' 
}) => {
    return (
        <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                />
                <div className="w-11 h-6 bg-gray-200 dark:bg-slate-600 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
            </div>
            {label && <span className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</span>}
        </label>
    );
};
