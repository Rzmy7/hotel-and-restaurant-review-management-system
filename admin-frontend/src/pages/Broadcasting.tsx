import React, { useEffect, useMemo, useState } from 'react';
import { Send, Search } from 'lucide-react';
import { Alert } from '../components/Alert';

import {
    AudienceSelector,
    BroadcastDetailOverlay,
    BroadcastHistoryRow,
    BroadcastPreviewModal,
    ChannelSelector,
    ContentEditor,
    MessageTypeSelector,
    SchedulingOptions,
} from '../components/Broadcasting';
import type { BroadcastRecord, ComposeForm } from '../components/Broadcasting';
import { broadcastingService } from '../services/broadcastingService';
import { useSystemTimezone } from '../hooks/useSystemTimezone';

interface BroadcastStats {
    total: number;
    sent: number;
    scheduled: number;
    failed: number;
}

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

export const Broadcasting: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

    const [form, setForm] = useState<ComposeForm>(emptyForm());
    const [history, setHistory] = useState<BroadcastRecord[]>([]);
    const [stats, setStats] = useState<BroadcastStats>({ total: 0, sent: 0, scheduled: 0, failed: 0 });

    const [estimatedCount, setEstimatedCount] = useState(0);
    const [showPreview, setShowPreview] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<BroadcastRecord | null>(null);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const systemTimezone = useSystemTimezone();

    // Pagination & Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [historyLoading, setHistoryLoading] = useState(false);
    const itemsPerPage = 10;

    const isFormValid = useMemo(() => {
        const hasCoreFields =
            form.subject.trim().length > 0 &&
            form.body.trim().length > 0 &&
            (form.audienceType === 'all' || form.audienceValue !== '');

        if (!hasCoreFields) {
            return false;
        }

        if (form.scheduleType === 'scheduled') {
            return form.scheduledAt.trim().length > 0;
        }

        return true;
    }, [form]);

    const refreshStats = async () => {
        try {
            const statsData = await broadcastingService.getStatistics();
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load broadcast statistics', error);
        }
    };

    const refreshEstimatedCount = async () => {
        try {
            const count = await broadcastingService.getEstimatedRecipients(
                form.audienceType,
                form.audienceValue || undefined,
            );
            setEstimatedCount(count);
        } catch (error) {
            console.error('Failed to estimate recipient count', error);
            setEstimatedCount(0);
        }
    };

    // Load stats on mount
    useEffect(() => {
        void refreshStats();
    }, []);

    // Load paginated/filtered history dynamically
    useEffect(() => {
        if (activeTab !== 'history') return;

        const fetchHistoryData = async () => {
            setHistoryLoading(true);
            try {
                const paginatedResponse = await broadcastingService.getHistory(
                    currentPage,
                    itemsPerPage,
                    searchQuery.trim() || undefined
                );
                setHistory(paginatedResponse.data);
                setTotalItems(paginatedResponse.total);
            } catch (error) {
                console.error('Failed to load broadcast history', error);
                setErrorMessage('Failed to load broadcast history');
            } finally {
                setHistoryLoading(false);
            }
        };

        const timer = setTimeout(() => {
            void fetchHistoryData();
        }, searchQuery ? 300 : 0);

        return () => clearTimeout(timer);
    }, [activeTab, currentPage, searchQuery]);

    useEffect(() => {
        void refreshEstimatedCount();
    }, [form.audienceType, form.audienceValue]);

    const updateForm = (updates: Partial<ComposeForm>) => {
        setForm(prev => ({ ...prev, ...updates }));
    };

    const handleSend = async () => {
        if (!isFormValid || sending) {
            return;
        }

        setSending(true);
        setErrorMessage(null);

        try {
            const result = await broadcastingService.sendBroadcast(form);
            setSuccessMessage(result.message || 'Broadcast request processed successfully');
            setShowPreview(false);
            setForm(emptyForm());
            setActiveTab('history');
            setCurrentPage(1); // Reset page to 1
            void refreshStats(); // Refresh stats cards
            window.setTimeout(() => setSuccessMessage(null), 4000);
        } catch (error) {
            console.error('Failed to send broadcast', error);
            setErrorMessage('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6 pt-4">
            {successMessage && (
                <Alert type="success" message={successMessage} onClose={() => setSuccessMessage(null)} />
            )}

            {errorMessage && (
                <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
            )}

            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Broadcasts', value: stats.total },
                    { label: 'Sent', value: stats.sent },
                    { label: 'Scheduled', value: stats.scheduled },
                    { label: 'Failed', value: stats.failed },
                ].map(stat => (
                    <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-4 py-3.5">
                        <div className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">{stat.label}</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</div>
                    </div>
                ))}
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {(['compose', 'history'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                            activeTab === tab ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 dark:text-slate-200'
                        }`}
                    >
                        {tab === 'compose' ? 'Compose Message' : 'Broadcast History'}
                    </button>
                ))}
            </div>

            {activeTab === 'compose' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                            <MessageTypeSelector
                                value={form.messageType}
                                onChange={messageType => updateForm({ messageType })}
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                            <ContentEditor
                                subject={form.subject}
                                body={form.body}
                                onSubjectChange={subject => updateForm({ subject })}
                                onBodyChange={body => updateForm({ body })}
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                            <SchedulingOptions
                                scheduleType={form.scheduleType}
                                scheduledAt={form.scheduledAt}
                                timezone={systemTimezone}
                                onScheduleTypeChange={scheduleType => updateForm({ scheduleType })}
                                onScheduledAtChange={scheduledAt => updateForm({ scheduledAt })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                            <ChannelSelector
                                value={form.channel}
                                onChange={channel => updateForm({ channel })}
                            />
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5">
                            <AudienceSelector
                                audienceType={form.audienceType}
                                audienceValue={form.audienceValue}
                                onAudienceTypeChange={audienceType => updateForm({ audienceType, audienceValue: '' })}
                                onAudienceValueChange={audienceValue => updateForm({ audienceValue })}
                            />

                            {estimatedCount > 0 && (
                                <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <span className="font-semibold">~{estimatedCount.toLocaleString()}</span> estimated recipients
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            disabled={!isFormValid}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Send size={15} />
                            Preview &amp; Send
                        </button>

                        {!isFormValid && (
                            <p className="text-xs text-gray-400 dark:text-slate-500 text-center -mt-2">
                                Fill in all required fields to continue
                            </p>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-slate-200">Broadcast History</h2>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{totalItems} broadcasts total</p>
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search subject or body..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 pr-4 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm w-60 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {historyLoading && history.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-slate-400">Loading history…</div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                                <Send size={22} className="text-gray-400 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">No broadcasts yet</p>
                            <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'Switch to Compose Message to send your first broadcast.'}
                            </p>
                        </div>
                    ) : (
                        <div className={historyLoading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}>
                            {history.map(record => (
                                <BroadcastHistoryRow
                                    key={record.id}
                                    record={record}
                                    timezone={systemTimezone}
                                    onViewDetail={setSelectedDetail}
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalItems > 0 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-900/50">
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                                Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} records
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    Previous
                                </button>
                                
                                {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1)
                                    .filter(p => p === 1 || p === Math.ceil(totalItems / itemsPerPage) || Math.abs(p - currentPage) <= 1)
                                    .map((p, i, arr) => (
                                        <React.Fragment key={p}>
                                            {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1 text-xs text-gray-500 dark:text-slate-400">...</span>}
                                            <button
                                                onClick={() => setCurrentPage(p)}
                                                className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${
                                                    currentPage === p
                                                        ? 'bg-blue-500 text-white border-blue-500'
                                                        : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        </React.Fragment>
                                    ))}

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1))}
                                    disabled={currentPage === Math.ceil(totalItems / itemsPerPage) || totalItems === 0}
                                    className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showPreview && (
                <BroadcastPreviewModal
                    form={form}
                    estimatedCount={estimatedCount}
                    timezone={systemTimezone}
                    onClose={() => setShowPreview(false)}
                    onSend={handleSend}
                    sending={sending}
                />
            )}

            {selectedDetail && (
                <BroadcastDetailOverlay
                    record={selectedDetail}
                    timezone={systemTimezone}
                    onClose={() => setSelectedDetail(null)}
                />
            )}
        </div>
    );
};
