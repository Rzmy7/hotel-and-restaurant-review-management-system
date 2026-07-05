import { useEffect, useRef } from 'react';
import { 
    X, CheckCircle2, XCircle, Clock, Info, AlertCircle, 
    Rocket, Database, Brain, PlusCircle, Trash2, Zap, 
    History, BarChart3, Loader2, ArrowRight, RefreshCw as RefreshIcon, Search
} from 'lucide-react';
import type { Source, SyncLog } from '../../types/sources';

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SyncHistoryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    logs: SyncLog[];
    isLoading?: boolean;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    onLoadMore?: () => void;
    activeSyncSourceId?: string | number;
    onFilterChange?: (filter: {type?: string, important?: boolean, sourceId?: string | number}) => void;
    currentFilter?: {type?: string, important?: boolean, sourceId?: string | number};
    onSearchChange?: (search: string) => void;
    currentSearch?: string;
    sources?: Source[];
    onExport?: () => void;
    onClear?: () => void;
}

const getActivityIcon = (type?: string, status?: string) => {
    if (status === 'Failed') return <XCircle size={18} className="text-rose-500" />;
    
    switch (type) {
        case 'SYNC_QUEUED': return <Clock size={18} className="text-gray-400" />;
        case 'SYNC_STARTED': return <Rocket size={18} className="text-blue-500" />;
        case 'SYNC_COMPLETED': return <CheckCircle2 size={18} className="text-emerald-500" />;
        case 'INGESTION_COMPLETED': return <Database size={18} className="text-amber-500" />;
        case 'AI_ANALYSIS_STARTED': return <Brain size={18} className="text-purple-500" />;
        case 'AI_ANALYSIS_COMPLETED': return <Zap size={18} className="text-indigo-500" />;
        case 'SOURCE_ADDED': return <PlusCircle size={18} className="text-teal-500" />;
        case 'SOURCE_REMOVED': return <Trash2 size={18} className="text-rose-400" />;
        default: return <Info size={18} className="text-gray-400" />;
    }
};

const SyncHistoryPanel: React.FC<SyncHistoryPanelProps> = ({ 
    isOpen, 
    onClose, 
    logs, 
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    activeSyncSourceId,
    onFilterChange,
    currentFilter,
    onSearchChange,
    currentSearch,
    sources = [],
    onExport,
    onClear
}) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const syncingSources = sources.filter(s => s.status === 'Syncing');



    // Infinite scroll listener
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !hasNextPage || isFetchingNextPage) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop <= clientHeight + 50) {
                onLoadMore?.();
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [isOpen, hasNextPage, isFetchingNextPage, onLoadMore]);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90] transition-opacity duration-500"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-white dark:bg-[#121826] border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[100] flex flex-col transition-transform duration-500 animate-in slide-in-from-right">
                
                {/* Header */}
                <div className="p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                            <History className="text-[#597FE6]" size={24} />
                            Activity Log
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                            Live system activity & history
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={onExport}
                            className="w-10 h-10 grid place-items-center rounded-xl bg-[#F9FAFB] dark:bg-slate-800 text-slate-500 hover:text-[#597FE6] transition-all"
                            title="Export to CSV"
                        >
                            <ArrowRight className="rotate-[-90deg]" size={18} />
                        </button>
                        <button 
                            onClick={() => {
                                if (confirm('Are you sure you want to clear the activity log? This will delete all history except the latest 5 entries.')) {
                                    onClear?.();
                                }
                            }}
                            className="w-10 h-10 grid place-items-center rounded-xl bg-[#F9FAFB] dark:bg-slate-800 text-slate-500 hover:text-rose-500 transition-all"
                            title="Clear History"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 grid place-items-center rounded-xl bg-[#F9FAFB] dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>


                <div className="px-8 py-6 flex gap-3 bg-[#F9FAFB] dark:bg-[#121826] border-b border-slate-100 dark:border-slate-800/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            value={currentSearch}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder="Search activity..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#597FE6]/50 transition-all"
                        />
                    </div>
                    <select
                        value={currentFilter?.sourceId || ''}
                        onChange={(e) => onFilterChange?.({ ...currentFilter, sourceId: e.target.value || undefined })}
                        className="px-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#597FE6]/50 transition-all cursor-pointer"
                    >
                        <option value="">All Sources</option>
                        {sources.map(s => (
                            <option key={s.id} value={s.id}>{s.platform}</option>
                        ))}
                    </select>
                </div>

                {/* Filter Tabs */}
                <div className="px-8 pb-8">
                    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                        {[
                            { label: 'All', filter: {} },
                            { label: 'Critical', filter: { important: true } },
                            { label: 'Syncs', filter: { type: 'SYNC_STARTED,SYNC_COMPLETED' } },
                            { label: 'System', filter: { type: 'SOURCE_ADDED,SOURCE_REMOVED,SYNC_SCHEDULE_UPDATED' } }
                        ].map((tab) => {
                            const isActive = 
                                (!tab.filter.important && !tab.filter.type && !currentFilter?.important && !currentFilter?.type) ||
                                (tab.filter.important === currentFilter?.important && tab.filter.type === currentFilter?.type);
                            return (
                                <button
                                    key={tab.label}
                                    onClick={() => onFilterChange?.({ ...tab.filter, sourceId: currentFilter?.sourceId })}
                                    className={cn(
                                        "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                                        isActive 
                                            ? "bg-white dark:bg-slate-700 text-[#597FE6] shadow-sm" 
                                            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active Syncing Indicators */}
                {isOpen && syncingSources.length > 0 && (
                    <div className="mx-8 mb-6 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 space-y-3">
                        <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                            Currently Syncing
                        </h4>
                        <div className="space-y-2">
                            {syncingSources.map((source) => (
                                <div key={source.id} className="flex items-center justify-between py-1">
                                    <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight flex items-center gap-2">
                                        <RefreshIcon size={12} className="text-blue-500 animate-spin" />
                                        {source.platform}
                                    </span>
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                        In Progress
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto px-8 py-4 space-y-8 scrollbar-hide"
                >
                    {logs.map((log, index) => (
                        <div key={log.id} className="relative flex gap-6 group">
                            {/* Line */}
                            {index !== logs.length - 1 && (
                                <div className="absolute left-[19px] top-10 bottom-[-32px] w-[2px] bg-slate-100 dark:bg-slate-800/50 group-hover:bg-[#597FE6]/20 transition-colors" />
                            )}

                            {/* Icon Wrapper */}
                            <div className={cn(
                                "relative w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-all duration-500",
                                log.status === 'Failed' 
                                    ? "bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800" 
                                    : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 shadow-sm"
                            )}>
                                {getActivityIcon(log.activityType, log.status)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        {log.activityType?.replace(/_/g, ' ') || 'Sync Activity'}
                                    </h4>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                                    {log.activityDetails || `Sync for ${log.platform} completed with ${log.reviewsFetched} reviews.`}
                                </p>

                                {log.status === 'Failed' && log.errorMessage && (
                                    <div className="mt-3 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-800/30 flex items-start gap-2">
                                        <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold leading-tight">
                                            {log.errorMessage}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading State */}
                    {(isLoading || isFetchingNextPage) && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="text-[#597FE6] animate-spin" size={32} />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                {isLoading ? 'Initializing Log...' : 'Loading history...'}
                            </p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-24 text-center">
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                                <History size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 dark:text-white font-black text-sm uppercase">No Activity Yet</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 max-w-[200px]">
                                Once you start syncing sources, your activity will appear here.
                            </p>
                        </div>
                    )}

                    {/* End of History */}
                    {!hasNextPage && logs.length > 0 && (
                        <div className="pt-8 pb-4 text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End of history</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Action */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-[#F9FAFB] dark:bg-[#121826]">
                    <button
                        onClick={onClose}
                        className="w-full py-4 px-6 bg-[#597FE6] text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl shadow-[#597FE6]/20"
                    >
                        Close History
                    </button>
                </div>
            </div>
        </>
    );
};

export default SyncHistoryPanel;
