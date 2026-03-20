import React from 'react';
import { AUDIENCE_OPTIONS } from './types';
import type { AudienceType } from './types';
import { Users, UserCheck } from 'lucide-react';

interface AudienceSelectorProps {
    audienceType: AudienceType;
    audienceValue: string;
    onAudienceTypeChange: (type: AudienceType) => void;
    onAudienceValueChange: (value: string) => void;
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
}) => {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">Target Audience *</label>
            <div className="space-y-3">
                {AUDIENCE_OPTIONS.map(opt => (
                    <div key={opt.value}>
                        <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all" style={{ borderColor: audienceType === opt.value ? '#2563eb' : '#e5e7eb' }}>
                            <input
                                type="radio"
                                name="audience"
                                value={opt.value}
                                checked={audienceType === opt.value}
                                onChange={() => onAudienceTypeChange(opt.value)}
                                className="w-4 h-4"
                            />
                            <span className="text-blue-600">{getAudienceIcon(opt.value)}</span>
                            <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                        </label>

                        {audienceType === opt.value && opt.subOptions && (
                            <div className="ml-8 mt-2 space-y-1.5">
                                {opt.subOptions.map(sub => (
                                    <label key={sub.value} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`${opt.value}_sub`}
                                            value={sub.value}
                                            checked={audienceValue === sub.value}
                                            onChange={() => onAudienceValueChange(sub.value)}
                                            className="w-3 h-3"
                                        />
                                        <span className="text-sm text-gray-700">{sub.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
