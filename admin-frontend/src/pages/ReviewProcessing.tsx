import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Play, Pause, RotateCcw, CheckCircle, XCircle, Grid3X3, Layers, Save, Minus, Plus, Copy, Trash2, AlertTriangle } from 'lucide-react';
import ReviewProcessingSkeleton from './ReviewProcessingSkeleton';
import { Alert } from '../components/Alert';
import {
    fetchReviewProcessingStats,
    fetchReviewProcessingJobs,
    getBatchConfig,
    updateBatchConfig,
    resumeReviewProcessing,
    pauseReviewProcessing,
    retryAllFailedReviews,
    testDuplicates,
    cleanupDuplicates,
} from '../services/reviewProcessingService';
import type {
    ReviewProcessingStats,
    ReviewProcessingJob,
    BatchConfig,
    DuplicateStats,
} from '../services/reviewProcessingService';
import { useSystemTimezone } from '../hooks/useSystemTimezone';
import { formatDateTime } from '../utils/dateTime';

const defaultStats: ReviewProcessingStats = {
    activeJobs: 0,
    activeJobsChange: 0,
    completedToday: 0,
    successRate: 0,
    failedJobs: 0,
    reviewsProcessed: 0,
    reviewsChange: 0,
    pendingReviews: 0,
    isPaused: false,
    pauseReason: 'manual',
};

export const ReviewProcessing: React.FC = () => {
    const systemTimezone = useSystemTimezone();
    const [stats, setStats] = useState<ReviewProcessingStats>(defaultStats);
    const [jobs, setJobs] = useState<ReviewProcessingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [totalItems, setTotalItems] = useState(0);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isRetryingAll, setIsRetryingAll] = useState(false);

    // Batch size config state
    const [batchConfig, setBatchConfig] = useState<BatchConfig | null>(null);
    const [batchInput, setBatchInput] = useState<number>(5);
    const [batchSaveState, setBatchSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [batchSaveMessage, setBatchSaveMessage] = useState<string | null>(null);
    
    // Duplication management state
    const [duplicateStats, setDuplicateStats] = useState<DuplicateStats | null>(null);
    const [isTestingDupes, setIsTestingDupes] = useState(false);
    const [isCleaningDupes, setIsCleaningDupes] = useState(false);
    const [dupeActionMessage, setDupeActionMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    // Debounce search query
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Initial load and background polling for stats
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [statsResult, batchResult] = await Promise.allSettled([
                    fetchReviewProcessingStats(),
                    getBatchConfig(),
                ]);

                if (statsResult.status === 'fulfilled') setStats(statsResult.value);
                if (batchResult.status === 'fulfilled') {
                    setBatchConfig(batchResult.value);
                    setBatchInput(batchResult.value.batch_size);
                }

                const errors: string[] = [];
                if (statsResult.status === 'rejected') errors.push('Failed to load review statistics.');
                if (errors.length > 0) setError(errors.join(' | '));
            } catch (err) {
                console.error('Failed to load review processing initial data:', err);
                setError('Failed to load review processing initial data.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        const interval = setInterval(async () => {
            try {
                const statsData = await fetchReviewProcessingStats();
                setStats(statsData);
            } catch (err) {
                console.error('Failed to poll review processing stats:', err);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Load jobs when page or search changes
    useEffect(() => {
        const loadJobs = async () => {
            try {
                setJobsLoading(true);
                const response = await fetchReviewProcessingJobs(currentPage, itemsPerPage, debouncedSearch);
                setJobs(response.data);
                setTotalItems(response.total);
            } catch (err) {
                console.error('Failed to fetch review processing jobs:', err);
                setError('Failed to fetch review processing jobs.');
            } finally {
                setJobsLoading(false);
            }
        };

        loadJobs();
    }, [currentPage, debouncedSearch]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setError(null);
            const [statsResult, jobsResult] = await Promise.allSettled([
                fetchReviewProcessingStats(),
                fetchReviewProcessingJobs(currentPage, itemsPerPage, debouncedSearch),
            ]);
            if (statsResult.status === 'fulfilled') setStats(statsResult.value);
            if (jobsResult.status === 'fulfilled') {
                setJobs(jobsResult.value.data);
                setTotalItems(jobsResult.value.total);
            }
        } catch (err) {
            console.error('Failed to refresh review processing data:', err);
            setError('Failed to refresh review processing data.');
        } finally {
            setRefreshing(false);
        }
    };

    const handleResumeProcessing = async () => {
        try {
            await resumeReviewProcessing();
            await handleRefresh();
        } catch (err) {
            console.error('Failed to resume review processing:', err);
            setError('Failed to resume review processing.');
        }
    };

    const handlePauseProcessing = async () => {
        try {
            await pauseReviewProcessing();
            await handleRefresh();
        } catch (err) {
            console.error('Failed to pause review processing:', err);
            setError('Failed to pause review processing.');
        }
    };



    const handleRetryAllFailed = async () => {
        if (!window.confirm(`Are you sure you want to retry all ${stats.failedJobs} failed reviews?`)) return;
        try {
            setIsRetryingAll(true);
            setError(null);
            await retryAllFailedReviews();
            await handleRefresh();
        } catch (err) {
            console.error('Failed to retry all failed reviews:', err);
            setError(err instanceof Error ? err.message : 'Failed to retry all failed reviews.');
        } finally {
            setIsRetryingAll(false);
        }
    };

    const handleSaveBatchSize = async () => {
        if (batchSaveState === 'saving') return;
        setBatchSaveState('saving');
        setBatchSaveMessage(null);
        try {
            const saved = await updateBatchConfig(batchInput);
            setBatchConfig(saved);
            setBatchInput(saved.batch_size);
            setBatchSaveState('saved');
            setBatchSaveMessage(`Batch size saved: ${saved.batch_size} reviews per batch.`);
            setTimeout(() => { setBatchSaveState('idle'); setBatchSaveMessage(null); }, 3000);
        } catch (err) {
            setBatchSaveState('error');
            setBatchSaveMessage(err instanceof Error ? err.message : 'Failed to save batch size.');
        }
    };

    const handleTestDuplicates = async () => {
        try {
            setIsTestingDupes(true);
            setDupeActionMessage(null);
            const res = await testDuplicates();
            setDuplicateStats(res.duplicates);
        } catch (err) {
            console.error('Failed to test for duplicates:', err);
            setError('Failed to run duplication test. Ensure admin-backend is running.');
        } finally {
            setIsTestingDupes(false);
        }
    };

    const handleCleanupDuplicates = async () => {
        const totalRedundant = (duplicateStats?.sources.redundant || 0) + (duplicateStats?.reviews.redundant || 0);
        if (totalRedundant === 0) return;
        
        if (!window.confirm(`Are you sure you want to delete all ${totalRedundant} redundant records? This action cannot be undone.`)) return;

        try {
            setIsCleaningDupes(true);
            setDupeActionMessage(null);
            const res = await cleanupDuplicates();
            setDupeActionMessage({ 
                text: `Successfully removed ${res.deleted.reviews} reviews and ${res.deleted.sources} sources.`, 
                type: 'success' 
            });
            setDuplicateStats(null);
            await handleRefresh();
        } catch (err) {
            console.error('Failed to cleanup duplicates:', err);
            setDupeActionMessage({ text: 'Failed to perform duplication cleanup.', type: 'error' });
        } finally {
            setIsCleaningDupes(false);
        }
    };

    const clamp = (v: number) =>
        Math.max(batchConfig?.min ?? 1, Math.min(batchConfig?.max ?? 20, v));

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const formatNumber = (num: number): string =>
        num >= 1000 ? (num / 1000).toFixed(1) + 'k' : num.toLocaleString();

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Running':   return 'bg-blue-100 text-blue-700';
            case 'Queued':    return 'bg-yellow-100 text-yellow-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'Failed':    return 'bg-red-100 text-red-700';
            case 'Paused':    return 'bg-orange-100 text-orange-700';
            default:          return 'bg-gray-100 text-gray-700 dark:text-slate-200';
        }
    };

    if (loading) return <ReviewProcessingSkeleton />;

    const batchMin = batchConfig?.min ?? 1;
    const batchMax = batchConfig?.max ?? 20;
    const isDirty = batchConfig !== null && batchInput !== batchConfig.batch_size;

    return (
        <div className="space-y-6 pt-4">
            {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

            {/* Pipeline Control Widget */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="relative flex h-3 w-3 shrink-0">
                        {!stats.isPaused && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.isPaused ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            Review Processing: <span className={stats.isPaused ? 'text-orange-500 font-bold' : 'text-green-600 font-bold'}>{stats.isPaused ? 'Paused' : 'Active'}</span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                            {stats.isPaused 
                                ? 'The background pipeline is currently paused. New reviews will be stored but not analyzed by AI until resumed.' 
                                : 'The background pipeline is running normally. New reviews are automatically analyzed in batches using the active LLM.'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={stats.isPaused ? handleResumeProcessing : handlePauseProcessing}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border shadow-sm shrink-0 ${
                        stats.isPaused 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-700' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:text-gray-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600 dark:hover:text-white'
                    }`}
                >
                    {stats.isPaused ? <Play size={16} /> : <Pause size={16} />}
                    {stats.isPaused ? 'Resume Processing' : 'Pause Processing'}
                </button>
            </div>

            {stats.isPaused && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="text-yellow-600 mt-0.5"><XCircle size={20} /></div>
                        <div>
                            <h3 className="text-sm font-medium text-yellow-800">Review Processing Paused</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                {stats.pauseReason === 'manual' ? (
                                    'Review processing has been manually paused. Click below to resume.'
                                ) : (
                                    'The system paused review processing due to an API rate limit or quota error. Please check your LLM model configuration, then click below to restart.'
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleResumeProcessing}
                        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors border border-yellow-300"
                    >
                        <Play size={16} />
                        {stats.pauseReason === 'manual' ? 'Resume Processing' : 'Restart Processing'}
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Active Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Play size={16} /></div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeJobs}</div>
                    <div className="text-xs text-green-600">+{stats.activeJobsChange} since last hour</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Completed Today</span>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle size={16} /></div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedToday.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{stats.successRate}% success rate</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Failed Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600"><XCircle size={16} /></div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failedJobs}</div>
                    <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-red-600">Requires attention</div>
                        {stats.failedJobs > 0 && (
                            <button
                                onClick={handleRetryAllFailed}
                                disabled={isRetryingAll}
                                className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50 transition-colors"
                            >
                                <RotateCcw size={10} className={isRetryingAll ? 'animate-spin' : ''} />
                                Retry All
                            </button>
                        )}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Reviews Processed</span>
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Grid3X3 size={16} /></div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.reviewsProcessed)}</div>
                    <div className="text-xs text-green-600">+{stats.reviewsChange}% vs last week</div>
                </div>
            </div>

            {/* Batch Size Configuration */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Layers size={18} className="text-blue-600" />
                            Processing Batch Size
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Controls how many reviews are sent to the AI model in a single API call.
                            Smaller batches reduce truncation risk; larger batches are faster.
                        </p>
                    </div>
                    {batchConfig && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                            Current: {batchConfig.batch_size}
                        </span>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                    {/* Stepper */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                            Batch Size
                            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">
                                ({batchMin}–{batchMax} reviews per batch)
                            </span>
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setBatchInput(v => clamp(v - 1))}
                                disabled={batchInput <= batchMin}
                                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus size={15} />
                            </button>
                            <input
                                type="number"
                                min={batchMin}
                                max={batchMax}
                                value={batchInput}
                                onChange={e => setBatchInput(clamp(parseInt(e.target.value, 10) || batchMin))}
                                className="w-20 text-center px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={() => setBatchInput(v => clamp(v + 1))}
                                disabled={batchInput >= batchMax}
                                className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={15} />
                            </button>

                            {/* Slider */}
                            <input
                                type="range"
                                min={batchMin}
                                max={batchMax}
                                value={batchInput}
                                onChange={e => setBatchInput(parseInt(e.target.value, 10))}
                                className="flex-1 accent-blue-500"
                            />
                        </div>

                        {/* Guidance labels */}
                        <div className="flex justify-between mt-1.5 text-xs text-gray-400 dark:text-slate-500">
                            <span>1 — Safest (no truncation)</span>
                            <span>20 — Fastest (higher risk)</span>
                        </div>
                    </div>

                    {/* Save button */}
                    <div className="flex flex-col gap-1.5">
                        <button
                            onClick={handleSaveBatchSize}
                            disabled={batchSaveState === 'saving' || !isDirty}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={15} />
                            {batchSaveState === 'saving' ? 'Saving…' : 'Save'}
                        </button>
                        {batchSaveMessage && (
                            <p className={`text-xs ${batchSaveState === 'saved' ? 'text-green-600' : 'text-red-600'}`}>
                                {batchSaveMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Duplication Management */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <Copy size={18} className="text-purple-600" />
                            Duplication Management
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                            Identify and remove redundant source configurations and identical reviews across the system.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
                    <div className="lg:col-span-2">
                        {duplicateStats ? (
                            <div className="flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Duplicated Sources</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">{duplicateStats.sources.redundant}</span>
                                        <span className="text-xs text-gray-400">across {duplicateStats.sources.groups} groups</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-600">
                                    <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-bold tracking-wider mb-1">Duplicated Reviews</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">{duplicateStats.reviews.redundant}</span>
                                        <span className="text-xs text-gray-400">across {duplicateStats.reviews.groups} groups</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-lg border border-dashed border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                                <AlertTriangle size={18} />
                                <span className="text-sm">Run a test to check for data redundancy in the system.</span>
                            </div>
                        )}
                        
                        {dupeActionMessage && (
                            <div className={`mt-3 p-3 rounded-lg text-sm flex items-center gap-2 ${
                                dupeActionMessage.type === 'success' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                                {dupeActionMessage.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                {dupeActionMessage.text}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                        <button
                            onClick={handleTestDuplicates}
                            disabled={isTestingDupes || isCleaningDupes}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isTestingDupes ? 'animate-spin' : ''} />
                            {isTestingDupes ? 'Testing...' : 'Run Duplication Test'}
                        </button>
                        <button
                            onClick={handleCleanupDuplicates}
                            disabled={isCleaningDupes || isTestingDupes || !duplicateStats || (duplicateStats.sources.redundant + duplicateStats.reviews.redundant === 0)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={16} className={isCleaningDupes ? 'animate-spin' : ''} />
                            {isCleaningDupes ? 'Cleaning...' : 'Cleanup Duplicates'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Job Status Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Processing Job Status</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Real-time monitoring of all active and recent review processing jobs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Job ID or Org..."
                                value={searchQuery}
                                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-9 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700">
                            <Filter size={16} />
                            Filter
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className={`overflow-x-auto ${jobsLoading ? 'opacity-50 pointer-events-none transition-opacity duration-200' : 'transition-opacity duration-200'}`}>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Job ID</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Platform</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Organization</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Start Time</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Processed</th>

                            </tr>
                        </thead>
                        <tbody>
                             {jobs.map(job => (
                                <tr key={job.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                                    <td className="py-4 px-4 text-sm font-mono text-gray-500 dark:text-slate-400">{job.jobId}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-7 h-7 rounded-md flex items-center justify-center text-white font-semibold text-xs"
                                                style={{ backgroundColor: job.platformColor }}
                                            >
                                                {job.platformIcon}
                                            </div>
                                            <span className="text-sm text-gray-900 dark:text-white">{job.platform}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{job.organization}</td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                                            {job.status === 'Running' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>}
                                            {job.status === 'Paused'  && <span className="w-1.5 h-1.5 rounded-full bg-current"></span>}
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{formatDateTime(job.startTime, systemTimezone)}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{job.duration}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">
                                        {job.reviewsProcessed !== null ? job.reviewsProcessed : '--'}
                                        {job.totalReviews !== null && job.reviewsProcessed !== null && (
                                            <span className="text-gray-400 dark:text-slate-500"> / {job.totalReviews}</span>
                                        )}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                        Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} jobs
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            Previous
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                            .map((p, i, arr) => (
                                <React.Fragment key={p}>
                                    {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2 text-gray-500 dark:text-slate-400">...</span>}
                                    <button
                                        onClick={() => setCurrentPage(p)}
                                        className={`px-3 py-1.5 border rounded-lg text-sm font-medium ${
                                            currentPage === p
                                                ? 'bg-blue-500 text-white border-blue-500'
                                                : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                </React.Fragment>
                            ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
