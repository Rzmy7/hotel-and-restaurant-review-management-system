import React, { useState } from 'react';
import {
    Send,
    Mail,
    Bell,
    Users,
    UserCheck,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Clock,
    Megaphone,
    AlertTriangle,
    Info,
    RotateCcw,
    Eye,
    X,
    Loader2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Channel = 'email' | 'notification' | 'both';
type AudienceType = 'all' | 'role' | 'organization' | 'plan';
type MessageType = 'info' | 'warning' | 'maintenance' | 'announcement';
type BroadcastStatus = 'sent' | 'failed' | 'pending';

interface BroadcastRecord {
    id: string;
    subject: string;
    body: string;
    channel: Channel;
    audienceType: AudienceType;
    audienceLabel: string;
    messageType: MessageType;
    recipientCount: number;
    status: BroadcastStatus;
    sentAt: string;
    sentBy: string;
}

interface ComposeForm {
    subject: string;
    body: string;
    channel: Channel;
    audienceType: AudienceType;
    audienceValue: string;
    messageType: MessageType;
    scheduleType: 'now' | 'scheduled';
    scheduledAt: string;
}

// ─── Mock history ─────────────────────────────────────────────────────────────

const MOCK_HISTORY: BroadcastRecord[] = [
    {
        id: 'b1',
        subject: 'Scheduled maintenance on March 20',
        body: 'We will be performing scheduled maintenance on March 20, 2026 from 02:00–04:00 UTC. The platform may be temporarily unavailable during this window.',
        channel: 'both',
        audienceType: 'all',
        audienceLabel: 'All Users',
        messageType: 'maintenance',
        recipientCount: 18392,
        status: 'sent',
        sentAt: '2026-03-15T10:30:00Z',
        sentBy: 'Admin User',
    },
    {
        id: 'b2',
        subject: 'New feature: Enhanced review scraping',
        body: 'We have rolled out improved scraping capabilities with support for 12 new platforms. Check your dashboard to explore the new sources.',
        channel: 'notification',
        audienceType: 'plan',
        audienceLabel: 'Professional & Enterprise',
        messageType: 'announcement',
        recipientCount: 3240,
        status: 'sent',
        sentAt: '2026-03-10T14:00:00Z',
        sentBy: 'Admin User',
    },
    {
        id: 'b3',
        subject: 'Action required: Verify your email address',
        body: 'Please verify your email address to continue using all features. Unverified accounts will be restricted after March 25.',
        channel: 'email',
        audienceType: 'role',
        audienceLabel: 'Role: User',
        messageType: 'warning',
        recipientCount: 17850,
        status: 'sent',
        sentAt: '2026-03-08T09:00:00Z',
        sentBy: 'Admin User',
    },
    {
        id: 'b4',
        subject: 'API rate limit policy update',
        body: 'Starting April 1, API rate limits will be enforced per plan tier. Please review the updated documentation.',
        channel: 'email',
        audienceType: 'plan',
        audienceLabel: 'Starter & above',
        messageType: 'info',
        recipientCount: 5120,
        status: 'failed',
        sentAt: '2026-03-05T16:45:00Z',
        sentBy: 'Admin User',
    },
    {
        id: 'b5',
        subject: 'Q1 2026 platform digest',
        body: 'Here is your quarterly summary of platform activity, new features, and upcoming changes.',
        channel: 'email',
        audienceType: 'all',
        audienceLabel: 'All Users',
        messageType: 'announcement',
        recipientCount: 18392,
        status: 'pending',
        sentAt: '2026-03-20T08:00:00Z',
        sentBy: 'Admin User',
    },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNELS: { value: Channel; label: string; description: string; icon: React.ReactNode }[] = [
    {
        value: 'email',
        label: 'Email',
        description: 'Delivered to user inbox',
        icon: <Mail size={18} />,
    },
    {
        value: 'notification',
        label: 'In-App Notification',
        description: 'Bell notification in panel',
        icon: <Bell size={18} />,
    },
    {
        value: 'both',
        label: 'Email + Notification',
        description: 'Send via both channels',
        icon: (
            <span className="flex gap-0.5">
                <Mail size={14} />
                <Bell size={14} />
            </span>
        ),
    },
];

const MESSAGE_TYPES: { value: MessageType; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
    { value: 'info', label: 'Info', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: <Info size={14} /> },
    { value: 'announcement', label: 'Announcement', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200', icon: <Megaphone size={14} /> },
    { value: 'warning', label: 'Warning', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: <AlertTriangle size={14} /> },
    { value: 'maintenance', label: 'Maintenance', color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: <RotateCcw size={14} /> },
];

const AUDIENCE_OPTIONS: { value: AudienceType; label: string; icon: React.ReactNode; subOptions?: { value: string; label: string }[] }[] = [
    {
        value: 'all',
        label: 'All Users',
        icon: <Users size={16} />,
    },
    {
        value: 'role',
        label: 'By Role',
        icon: <UserCheck size={16} />,
        subOptions: [
            { value: 'admin', label: 'Admins only' },
            { value: 'user', label: 'Users (non-admin)' },
        ],
    },
    {
        value: 'plan',
        label: 'By Plan',
        icon: <UserCheck size={16} />,
        subOptions: [
            { value: 'free', label: 'Free plan' },
            { value: 'starter', label: 'Starter plan' },
            { value: 'professional', label: 'Professional plan' },
            { value: 'enterprise', label: 'Enterprise plan' },
        ],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

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

const generateId = () => `bc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const emptyForm = (): ComposeForm => ({
    subject: '',
    body: '',
    channel: 'both',
    audienceType: 'all',
    audienceValue: '',
    messageType: 'info',
    scheduleType: 'now',
    scheduledAt: '',
});

// ─── Preview Modal ────────────────────────────────────────────────────────────

interface PreviewModalProps {
    form: ComposeForm;
    estimatedCount: number;
    onClose: () => void;
    onSend: () => void;
    sending: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ form, estimatedCount, onClose, onSend, sending }) => {
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
                                {form.scheduleType === 'now' ? 'Send immediately' : formatTimestamp(form.scheduledAt)}
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
                            <><Send size={15} /> Confirm &amp; Send</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── History Row ──────────────────────────────────────────────────────────────

interface HistoryRowProps {
    record: BroadcastRecord;
    onViewDetail: (r: BroadcastRecord) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ record, onViewDetail }) => {
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
                    <span className="text-xs text-gray-400">{formatTimestamp(record.sentAt)}</span>
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

// ─── Detail Slide-Over ────────────────────────────────────────────────────────

interface DetailOverlayProps {
    record: BroadcastRecord;
    onClose: () => void;
}

const DetailOverlay: React.FC<DetailOverlayProps> = ({ record, onClose }) => {
    const mt = msgTypeMeta(record.messageType);
    const ch = channelMeta(record.channel);
    const st = statusMeta(record.status);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <div className="relative bg-white w-full sm:w-[420px] h-full sm:h-auto sm:max-h-[90vh] sm:rounded-l-2xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">Broadcast Detail</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${mt.bg} ${mt.color}`}>
                            {mt.icon} {mt.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${st.color}`}>
                            {st.icon} {st.label}
                        </span>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Subject</p>
                        <p className="text-sm font-semibold text-gray-900">{record.subject}</p>
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Message</p>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{record.body}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Channel</p>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${ch.color}`}>
                                {ch.icon} {ch.label}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Audience</p>
                            <p className="text-sm text-gray-800 font-medium">{record.audienceLabel}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Recipients</p>
                            <p className="text-sm font-semibold text-gray-900">{record.recipientCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">Sent by</p>
                            <p className="text-sm text-gray-800">{record.sentBy}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-0.5">Sent at</p>
                            <p className="text-sm text-gray-800">{formatTimestamp(record.sentAt)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Broadcasting: React.FC = () => {
    const [history, setHistory] = useState<BroadcastRecord[]>(MOCK_HISTORY);
    const [form, setForm] = useState<ComposeForm>(emptyForm());
    const [showPreview, setShowPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [detailRecord, setDetailRecord] = useState<BroadcastRecord | null>(null);
    const [sentBanner, setSentBanner] = useState(false);
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

    // Derived
    const selectedAudience = AUDIENCE_OPTIONS.find(a => a.value === form.audienceType)!;
    const estimatedCount = form.audienceType === 'all' ? 18392
        : form.audienceType === 'role' && form.audienceValue === 'admin' ? 542
        : form.audienceType === 'role' ? 17850
        : form.audienceType === 'plan' && form.audienceValue === 'enterprise' ? 1200
        : form.audienceType === 'plan' && form.audienceValue === 'professional' ? 2040
        : form.audienceType === 'plan' ? 5120
        : form.audienceType === 'organization' ? 7800
        : 0;

    const isFormValid = form.subject.trim().length > 0
        && form.body.trim().length > 0
        && (form.audienceType === 'all' || form.audienceValue !== '')
        && (form.scheduleType === 'now' || form.scheduledAt !== '');

    const updateForm = <K extends keyof ComposeForm>(key: K, value: ComposeForm[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleAudienceTypeChange = (t: AudienceType) => {
        setForm(prev => ({ ...prev, audienceType: t, audienceValue: '' }));
    };

    const handleSend = async () => {
        setSending(true);
        await new Promise(r => setTimeout(r, 1400));

        const audienceOpt = AUDIENCE_OPTIONS.find(a => a.value === form.audienceType)!;
        const subLabel = audienceOpt.subOptions?.find(s => s.value === form.audienceValue)?.label ?? '';
        const audienceLabel = form.audienceType === 'all' ? 'All Users' : `${audienceOpt.label}: ${subLabel}`;

        const newRecord: BroadcastRecord = {
            id: generateId(),
            subject: form.subject,
            body: form.body,
            channel: form.channel,
            audienceType: form.audienceType,
            audienceLabel,
            messageType: form.messageType,
            recipientCount: estimatedCount,
            status: form.scheduleType === 'now' ? 'sent' : 'pending',
            sentAt: form.scheduleType === 'now' ? new Date().toISOString() : form.scheduledAt,
            sentBy: 'Admin User',
        };

        setHistory(prev => [newRecord, ...prev]);
        setSending(false);
        setShowPreview(false);
        setForm(emptyForm());
        setSentBanner(true);
        setTimeout(() => setSentBanner(false), 4000);
        setActiveTab('history');
    };

    return (
        <div className="pt-4 space-y-5 max-w-6xl">
            {/* Success Banner */}
            {sentBanner && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                    <span>Broadcast sent successfully! It has been added to your history.</span>
                    <button onClick={() => setSentBanner(false)} className="ml-auto text-green-600 hover:text-green-800">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Stats Strip */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Broadcasts', value: history.length },
                    { label: 'Sent', value: history.filter(h => h.status === 'sent').length },
                    { label: 'Scheduled', value: history.filter(h => h.status === 'pending').length },
                    { label: 'Failed', value: history.filter(h => h.status === 'failed').length },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3.5">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['compose', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab === 'compose' ? 'Compose Message' : 'Broadcast History'}
                    </button>
                ))}
            </div>

            {/* ── COMPOSE TAB ── */}
            {activeTab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Main compose form */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Message Type */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Message Type</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {MESSAGE_TYPES.map(mt => (
                                    <button
                                        key={mt.value}
                                        type="button"
                                        onClick={() => updateForm('messageType', mt.value)}
                                        className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.messageType === mt.value ? `${mt.bg} ${mt.color} border-current` : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {mt.icon}
                                        {mt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject + Body */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
                            <h2 className="text-sm font-semibold text-gray-700">Message Content</h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={e => updateForm('subject', e.target.value)}
                                    placeholder="Enter message subject..."
                                    maxLength={150}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{form.subject.length}/150</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message Body *</label>
                                <textarea
                                    value={form.body}
                                    onChange={e => updateForm('body', e.target.value)}
                                    placeholder="Write your message here..."
                                    rows={6}
                                    maxLength={2000}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{form.body.length}/2000</p>
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Send Timing</h2>
                            <div className="flex gap-3">
                                {(['now', 'scheduled'] as const).map(opt => (
                                    <label key={opt} className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.scheduleType === opt ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input
                                            type="radio"
                                            name="scheduleType"
                                            value={opt}
                                            checked={form.scheduleType === opt}
                                            onChange={() => updateForm('scheduleType', opt)}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            {opt === 'now' ? 'Send immediately' : 'Schedule for later'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {form.scheduleType === 'scheduled' && (
                                <div className="mt-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Scheduled Date &amp; Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduledAt}
                                        onChange={e => updateForm('scheduledAt', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar: Channel + Audience + Send */}
                    <div className="space-y-4">

                        {/* Channel */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Delivery Channel *</h2>
                            <div className="space-y-2">
                                {CHANNELS.map(ch => (
                                    <label
                                        key={ch.value}
                                        className={`flex items-center gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-all ${form.channel === ch.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="channel"
                                            value={ch.value}
                                            checked={form.channel === ch.value}
                                            onChange={() => updateForm('channel', ch.value)}
                                            className="text-blue-600"
                                        />
                                        <div className={`flex-shrink-0 ${form.channel === ch.value ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {ch.icon}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{ch.label}</p>
                                            <p className="text-xs text-gray-400">{ch.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Audience */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                            <h2 className="text-sm font-semibold text-gray-700 mb-3">Target Audience *</h2>
                            <div className="space-y-2">
                                {AUDIENCE_OPTIONS.map(ao => (
                                    <label
                                        key={ao.value}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${form.audienceType === ao.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="audienceType"
                                            checked={form.audienceType === ao.value}
                                            onChange={() => handleAudienceTypeChange(ao.value)}
                                            className="text-blue-600"
                                        />
                                        <span className={`flex-shrink-0 ${form.audienceType === ao.value ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {ao.icon}
                                        </span>
                                        <span className="text-sm font-medium text-gray-800">{ao.label}</span>
                                    </label>
                                ))}
                            </div>

                            {/* Sub-option dropdown */}
                            {selectedAudience.subOptions && (
                                <div className="mt-3">
                                    <div className="relative">
                                        <select
                                            value={form.audienceValue}
                                            onChange={e => updateForm('audienceValue', e.target.value)}
                                            className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                        >
                                            <option value="">Select {selectedAudience.label}…</option>
                                            {selectedAudience.subOptions.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {/* Estimated count */}
                            {estimatedCount > 0 && (
                                <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <span className="font-semibold">~{estimatedCount.toLocaleString()}</span> estimated recipients
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Send Button */}
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            disabled={!isFormValid}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Eye size={15} />
                            Preview &amp; Send
                        </button>
                        {!isFormValid && (
                            <p className="text-xs text-gray-400 text-center -mt-2">
                                Fill in all required fields to continue
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700">Broadcast History</h2>
                            <p className="text-xs text-gray-400 mt-0.5">{history.length} broadcasts total</p>
                        </div>
                    </div>

                    {history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                                <Send size={22} className="text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">No broadcasts yet</p>
                            <p className="text-sm text-gray-400 mt-1">Switch to Compose Message to send your first broadcast.</p>
                        </div>
                    ) : (
                        <div>
                            {history.map(record => (
                                <HistoryRow
                                    key={record.id}
                                    record={record}
                                    onViewDetail={setDetailRecord}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <PreviewModal
                    form={form}
                    estimatedCount={estimatedCount}
                    onClose={() => setShowPreview(false)}
                    onSend={handleSend}
                    sending={sending}
                />
            )}

            {/* Detail Overlay */}
            {detailRecord && (
                <DetailOverlay
                    record={detailRecord}
                    onClose={() => setDetailRecord(null)}
                />
            )}
        </div>
    );
};
