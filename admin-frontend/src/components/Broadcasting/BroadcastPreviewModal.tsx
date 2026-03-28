import React from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { CHANNELS, MESSAGE_TYPES, AUDIENCE_OPTIONS } from './types';
import type { ComposeForm, MessageType } from './types';
import { formatDateTime } from '../../utils/dateTime';

interface PreviewModalProps {
    form: ComposeForm;
    estimatedCount: number;
    timezone: string;
    onClose: () => void;
    onSend: () => void;
    sending: boolean;
}

const msgTypeMeta = (t: MessageType) => MESSAGE_TYPES.find(m => m.value === t)!;

export const BroadcastPreviewModal: React.FC<PreviewModalProps> = ({ form, estimatedCount, timezone, onClose, onSend, sending }) => {
    const mt = msgTypeMeta(form.messageType);
    const audienceOpt = AUDIENCE_OPTIONS.find(a => a.value === form.audienceType)!;
    const subLabel = audienceOpt.subOptions?.find(s => s.value === form.audienceValue)?.label ?? '';
    const audienceLabel = form.audienceType === 'all' ? 'All Users' : `${audienceOpt.label}: ${subLabel}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">Preview Broadcast</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    {/* Message type badge */}
                    <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${mt.bg} ${mt.color}`}>
                        {mt.icon}
                        {mt.label}
                    </div>

                    {/* Subject */}
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                        <p className="text-sm font-semibold text-gray-900">{form.subject}</p>
                    </div>

                    {/* Body */}
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Message</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{form.body}</p>
                    </div>

                    {/* Meta */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Delivery Channel</p>
                            <p className="text-sm font-medium text-gray-800">
                                {CHANNELS.find(c => c.value === form.channel)?.label}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Recipients</p>
                            <p className="text-sm font-medium text-gray-800">{audienceLabel}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Est. Recipients</p>
                            <p className="text-sm font-semibold text-gray-900">~{estimatedCount.toLocaleString()} users</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Timing</p>
                            <p className="text-sm font-medium text-gray-800">
                                {form.scheduleType === 'now' ? 'Send immediately' : formatDateTime(form.scheduledAt, timezone)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/70 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors"
                    >
                        Back to Edit
                    </button>
                    <button
                        onClick={onSend}
                        disabled={sending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                        {sending ? (
                            <><Loader2 size={15} className="animate-spin" /> Sending...</>
                        ) : (
                            <><Send size={15} /> Confirm & Send</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
