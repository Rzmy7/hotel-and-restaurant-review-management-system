import React from 'react';
import { AUDIENCE_OPTIONS } from './types';
import type { AudienceType } from './types';
import { Users, UserCheck } from 'lucide-react';

interface AudienceSelectorProps {
    audienceType: AudienceType;
    audienceValue: string;
    onAudienceTypeChange: (type: AudienceType) => void;
    onAudienceValueChange: (value: string) => void;
    planOptions?: { value: string; label: string }[];
}

const getAudienceIcon = (type: AudienceType) => {
    if (type === 'all') return <Users size={16} />;
    return <UserCheck size={16} />;
};

export const AudienceSelector: React.FC<AudienceSelectorProps> = ({
    audienceType,
    audienceValue,
    onAudienceTypeChange,
    onAudienceValueChange,
    planOptions,
}) => {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Target Audience *</label>
            <div className="space-y-3">
                {AUDIENCE_OPTIONS.map(opt => {
                    const subOptions = opt.value === 'plan' && planOptions && planOptions.length > 0
                        ? planOptions
                        : opt.subOptions;

                    return (
                        <div key={opt.value}>
                            <label
                                className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                                    audienceType === opt.value
                                        ? 'border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                        : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="audience"
                                    value={opt.value}
                                    checked={audienceType === opt.value}
                                    onChange={() => onAudienceTypeChange(opt.value)}
                                    className="w-4 h-4"
                                />
                                <span className="text-blue-600 dark:text-blue-400">{getAudienceIcon(opt.value)}</span>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
                            </label>

                            {audienceType === opt.value && subOptions && (
                                <div className="ml-8 mt-2 space-y-1.5">
                                    {subOptions.map(sub => (
                                        <label key={sub.value} className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                                            <input
                                                type="radio"
                                                name={`${opt.value}_sub`}
                                                value={sub.value}
                                                checked={audienceValue === sub.value}
                                                onChange={() => onAudienceValueChange(sub.value)}
                                                className="w-3 h-3"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-slate-200">{sub.label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
