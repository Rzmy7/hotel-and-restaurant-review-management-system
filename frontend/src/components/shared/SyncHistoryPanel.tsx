import { X, CheckCircle2, XCircle, Clock, Info, AlertCircle } from 'lucide-react';
import type { SyncLog } from '../../types/sources';

interface SyncHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    logs: SyncLog[];
    isLoading?: boolean;
}

const SyncHistoryPanel: React.FC<SyncHistoryPanelProps> = ({ isOpen, onClose, logs, isLoading }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[1001] transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[1002] flex flex-col transition-transform transform translate-x-0">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Activity Log</h2>
                        <p className="text-sm text-gray-500">Track recent sync updates</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-gray-400 hover:text-gray-900"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                            <div className="p-4 bg-gray-50 rounded-full mb-4">
                                <Info className="text-gray-300" size={32} />
                            </div>
                            <p className="text-gray-500 font-medium">No sync logs found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-100 transition-colors shadow-sm"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {log.status === 'Success' ? (
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            ) : log.status === 'Failed' ? (
                                                <XCircle size={16} className="text-rose-500" />
                                            ) : (
                                                <Clock size={16} className="text-blue-500 animate-spin" />
                                            )}
                                            <span className="font-semibold text-gray-900">{log.platform}</span>
                                        </div>
                                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-[13px]">
                                        <div className="text-gray-500">
                                            Fetched: <span className="text-gray-900 font-medium">{log.reviewsFetched} reviews</span>
                                        </div>
                                        <div className="text-gray-400">
                                            {log.durationMs / 1000}s
                                        </div>
                                    </div>

                                    {log.errorMessage && (
                                        <div className="mt-3 p-2 bg-rose-50 rounded-md text-[12px] text-rose-600 flex items-start gap-2">
                                            <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                            <span>{log.errorMessage}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50/30">
                    <button
                        className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        onClick={onClose}
                    >
                        Close Panel
                    </button>
                </div>
            </div>
        </>
    );
};

export default SyncHistoryPanel;
