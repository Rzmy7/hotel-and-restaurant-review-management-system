import React from 'react';
import { Eye } from 'lucide-react';
import { Mail, Bell } from 'lucide-react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { MESSAGE_TYPES } from './types';
import type { BroadcastRecord, Channel, BroadcastStatus, MessageType } from './types';
import { formatDateTime } from '../../utils/dateTime';

interface HistoryRowProps {
    record: BroadcastRecord;
    timezone: string;
    onViewDetail: (r: BroadcastRecord) => void;
}

const channelMeta = (ch: Channel) => {
    if (ch === 'email') return { label: 'Email', icon: <Mail size={12} />, color: 'text-blue-600 bg-blue-50 border-blue-200' };
    if (ch === 'notification') return { label: 'Notification', icon: <Bell size={12} />, color: 'text-violet-600 bg-violet-50 border-violet-200' };
    return { label: 'Email + Notif', icon: <span className="flex gap-0.5"><Mail size={10} /><Bell size={10} /></span>, color: 'text-teal-600 bg-teal-50 border-teal-200' };
};

const statusMeta = (s: BroadcastStatus) => {
    if (s === 'sent') return { label: 'Sent', icon: <CheckCircle2 size={13} />, color: 'text-green-600 bg-green-50 border-green-200' };
    if (s === 'failed') return { label: 'Failed', icon: <XCircle size={13} />, color: 'text-red-600 bg-red-50 border-red-200' };
    return { label: 'Scheduled', icon: <Clock size={13} />, color: 'text-amber-600 bg-amber-50 border-amber-200' };
};

const msgTypeMeta = (t: MessageType) => MESSAGE_TYPES.find(m => m.value === t)!;

export const BroadcastHistoryRow: React.FC<HistoryRowProps> = ({ record, timezone, onViewDetail }) => {
    const ch = channelMeta(record.channel);
    const st = statusMeta(record.status);
    const mt = msgTypeMeta(record.messageType);

    return (
        <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
            {/* Type indicator */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${mt.bg} ${mt.color}`}>
                {mt.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{record.subject}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatDateTime(record.sentAt, timezone)}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-500">{record.audienceLabel}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-500">{record.recipientCount.toLocaleString()} recipients</span>
                </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${ch.color}`}>
                    {ch.icon}
                    {ch.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${st.color}`}>
                    {st.icon}
                    {st.label}
                </span>
            </div>

            {/* View detail */}
            <button
                onClick={() => onViewDetail(record)}
                className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="View details"
            >
                <Eye size={15} />
            </button>
        </div>
    );
};
