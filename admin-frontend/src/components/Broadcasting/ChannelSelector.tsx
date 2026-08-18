import React from 'react';
import { CHANNELS } from './types';
import type { Channel } from './types';
import { Mail, Bell } from 'lucide-react';

interface ChannelSelectorProps {
    value: Channel;
    onChange: (channel: Channel) => void;
}

const getChannelIcon = (channel: Channel) => {
    if (channel === 'email') return <Mail size={18} />;
    if (channel === 'notification') return <Bell size={18} />;
    return <span className="flex gap-0.5"><Mail size={14} /><Bell size={14} /></span>;
};

export const ChannelSelector: React.FC<ChannelSelectorProps> = ({ value, onChange }) => {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">Delivery Channel *</label>
            <div className="space-y-2">
                {CHANNELS.map(channel => (
                    <label
                        key={channel.value}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                            value === channel.value
                                ? 'border-blue-500 dark:border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                        }`}
                    >
                        <input
                            type="radio"
                            name="channel"
                            value={channel.value}
                            checked={value === channel.value}
                            onChange={() => onChange(channel.value)}
                            className="w-4 h-4"
                        />
                        <span className="text-blue-600 dark:text-blue-400">{getChannelIcon(channel.value)}</span>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{channel.label}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{channel.description}</p>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};
