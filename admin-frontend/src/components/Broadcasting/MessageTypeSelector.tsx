import React from 'react';
import { MESSAGE_TYPES } from './types';
import type { MessageType } from './types';

interface MessageTypeSelectorProps {
    value: MessageType;
    onChange: (type: MessageType) => void;
}

export const MessageTypeSelector: React.FC<MessageTypeSelectorProps> = ({ value, onChange }) => {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Message Type *</label>
            <div className="flex gap-2">
                {MESSAGE_TYPES.map(type => (
                    <button
                        key={type.value}
                        onClick={() => onChange(type.value)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            value === type.value
                                ? `${type.bg} ${type.color} border-current`
                                : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600'
                        }`}
                    >
                        {type.icon}
                        {type.label}
                    </button>
                ))}
            </div>
        </div>
    );
};
