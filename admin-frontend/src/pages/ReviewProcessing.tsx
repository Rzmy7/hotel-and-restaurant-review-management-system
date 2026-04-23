import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Play, RotateCcw, Eye, CheckCircle, XCircle, Grid3X3, KeyRound, Save, Cpu, Clock } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import {
    fetchReviewProcessingStats,
    fetchReviewProcessingJobs,
    getGeminiApiKeyConfig,
    saveGeminiApiKey,
    testGeminiApiKey,
    resumeReviewProcessing,
} from '../services/reviewProcessingService';
import type {
    ReviewProcessingStats,
    ReviewProcessingJob,
    GeminiApiKeyConfig,
} from '../services/reviewProcessingService';

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
};

const defaultGeminiConfig: GeminiApiKeyConfig = {
    apiKey: '',
    isConfigured: false,
    lastTestedAt: null,
    lastTestResult: null,
};

export const ReviewProcessing: React.FC = () => {
    const [stats, setStats] = useState<ReviewProcessingStats>(defaultStats);
    const [jobs, setJobs] = useState<ReviewProcessingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Gemini API Key state
    const [geminiConfig, setGeminiConfig] = useState<GeminiApiKeyConfig>(defaultGeminiConfig);
    const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
    const [geminiSaveState, setGeminiSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [geminiSaveMessage, setGeminiSaveMessage] = useState<string | null>(null);
    const [geminiTestState, setGeminiTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [geminiTestMessage, setGeminiTestMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async (isRefresh = false) => {
            try {
                if (isRefresh) {
                    setRefreshing(true);
                } else {
                    setLoading(true);
                }
                setError(null);

                const [statsResult, jobsResult, geminiResult] = await Promise.allSettled([
                    fetchReviewProcessingStats(),
                    fetchReviewProcessingJobs(),
                    getGeminiApiKeyConfig(),
                ]);

                if (statsResult.status === 'fulfilled') setStats(statsResult.value);
                if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value);
                if (geminiResult.status === 'fulfilled') {
                    setGeminiConfig(geminiResult.value);
                    if (!isRefresh && geminiResult.value.apiKey) {
                        setGeminiApiKeyInput(geminiResult.value.apiKey);
                    }
                }

                const errors: string[] = [];
                if (statsResult.status === 'rejected' && jobsResult.status === 'rejected') {
                    errors.push('Review processing service is unreachable (stats and jobs unavailable).');
                }
                if (errors.length > 0) setError(errors.join(' | '));
            } catch (err) {
                console.error('Failed to load review processing data:', err);
                setError('Failed to load review processing data. Check admin-backend connectivity.');
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        };

        loadData();

        const interval = setInterval(() => {
            loadData(true);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setError(null);
            const [statsResult, jobsResult] = await Promise.allSettled([
                fetchReviewProcessingStats(),
                fetchReviewProcessingJobs(),
            ]);
            if (statsResult.status === 'fulfilled') setStats(statsResult.value);
            if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value);
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

    const handleSaveGeminiKey = async () => {
        if (geminiSaveState === 'saving') return;

        const key = geminiApiKeyInput.trim();
        if (!key) {
            setGeminiSaveState('error');
            setGeminiSaveMessage('Please enter a Gemini API key.');
            return;
        }

        setGeminiSaveState('saving');
        setGeminiSaveMessage(null);

        try {
            await saveGeminiApiKey(key);
            setGeminiConfig(prev => ({ ...prev, apiKey: key, isConfigured: true }));
            setGeminiSaveState('saved');
            setGeminiSaveMessage('Gemini API key saved successfully.');
            window.setTimeout(() => {
                setGeminiSaveState('idle');
                setGeminiSaveMessage(null);
            }, 3000);
        } catch (err) {
            console.error('Failed to save Gemini API key:', err);
            setGeminiSaveState('error');
            setGeminiSaveMessage(err instanceof Error ? err.message : 'Failed to save Gemini API key.');
        }
    };

    const handleTestGeminiKey = async () => {
        if (geminiTestState === 'testing') return;

        const key = geminiApiKeyInput.trim();
        if (!key) {
            setGeminiTestState('error');
            setGeminiTestMessage('Please enter a Gemini API key to test.');
            return;
        }

        setGeminiTestState('testing');
        setGeminiTestMessage(null);

        try {
            const result = await testGeminiApiKey(key);
            setGeminiTestState(result.success ? 'success' : 'error');
            setGeminiTestMessage(result.message);
        } catch (err) {
            setGeminiTestState('error');
            setGeminiTestMessage(err instanceof Error ? err.message : 'Failed to test Gemini API key.');
        }
    };

    const filteredJobs = jobs.filter(job => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return (
            job.jobId.toLowerCase().includes(query)
            || job.organization.toLowerCase().includes(query)
            || job.platform.toLowerCase().includes(query)
        );
    });

    const formatNumber = (num: number): string => {
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toLocaleString();
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Running': return 'bg-blue-100 text-blue-700';
            case 'Queued': return 'bg-yellow-100 text-yellow-700';
            case 'Completed': return 'bg-green-100 text-green-700';
            case 'Failed': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-6 pt-4">
            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {stats.isPaused && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-4 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                        <div className="text-yellow-600 mt-0.5">
                            <XCircle size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-yellow-800">Review Processing Paused</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                The system detected that the Gemini API has reached its usage limit or quota.
                                Review processing has been automatically paused to prevent further errors.
                                Please update your API key or quota settings, then click below to restart.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleResumeProcessing}
                        className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors border border-yellow-300"
                    >
                        <Play size={16} />
                        Restart Processing
                    </button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Active Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Play size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.activeJobs}</div>
                    <div className="text-xs text-green-600">+{stats.activeJobsChange} since last hour</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Completed Today</span>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.completedToday.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{stats.successRate}% success rate</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Failed Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.failedJobs}</div>
                    <div className="text-xs text-red-600">Requires attention</div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Reviews Processed</span>
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <Grid3X3 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.reviewsProcessed)}</div>
                    <div className="text-xs text-green-600">+{stats.reviewsChange}% vs last week</div>
                </div>
            </div>

            {/* Gemini API Key Configuration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <KeyRound size={18} className="text-blue-600" />
                            Gemini API Key Configuration
                        </h2>
                        <p className="text-sm text-gray-500 mt-0.5">Configure the Gemini API key used for AI-powered review processing and analysis.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {geminiConfig.isConfigured ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                Configured
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                                Not Configured
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Gemini API Key</label>
                        <input
                            type="password"
                            value={geminiApiKeyInput}
                            onChange={(e) => {
                                setGeminiApiKeyInput(e.target.value);
                                setGeminiSaveState('idle');
                                setGeminiSaveMessage(null);
                                setGeminiTestState('idle');
                                setGeminiTestMessage(null);
                            }}
                            placeholder="Enter your Gemini API key..."
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1.5">
                            Obtain your API key from{' '}
                            <a
                                href="https://aistudio.google.com/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 underline"
                            >
                                Google AI Studio
                            </a>.
                            This key is used for sentiment analysis, categorization, and review processing tasks.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleTestGeminiKey}
                            disabled={geminiTestState === 'testing'}
                            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-60"
                        >
                            <Cpu size={16} />
                            {geminiTestState === 'testing' ? 'Testing...' : 'Test Key'}
                        </button>
                        <button
                            onClick={handleSaveGeminiKey}
                            disabled={geminiSaveState === 'saving'}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-60"
                        >
                            <Save size={16} />
                            {geminiSaveState === 'saving' ? 'Saving...' : 'Save Key'}
                        </button>

                        {geminiTestMessage && (
                            <span className={`text-sm ${geminiTestState === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {geminiTestMessage}
                            </span>
                        )}
                        {geminiSaveMessage && (
                            <span className={`text-sm ${geminiSaveState === 'saved' ? 'text-green-600' : 'text-red-600'}`}>
                                {geminiSaveMessage}
                            </span>
                        )}
                    </div>

                    {geminiConfig.lastTestedAt && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock size={12} />
                            Last tested: {geminiConfig.lastTestedAt}
                            {geminiConfig.lastTestResult && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    geminiConfig.lastTestResult === 'success'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                }`}>
                                    {geminiConfig.lastTestResult === 'success' ? 'Passed' : 'Failed'}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Job Status Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Processing Job Status</h2>
                        <p className="text-sm text-gray-500">Real-time monitoring of all active and recent review processing jobs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Job ID or Org..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
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

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Job ID</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Organization</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Time</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Processed</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredJobs.map(job => (
                                <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-4 px-4 text-sm font-mono text-gray-500">{job.jobId}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-7 h-7 rounded-md flex items-center justify-center text-white font-semibold text-xs"
                                                style={{ backgroundColor: job.platformColor }}
                                            >
                                                {job.platformIcon}
                                            </div>
                                            <span className="text-sm text-gray-900">{job.platform}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-900">{job.organization}</td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(job.status)}`}>
                                            {job.status === 'Running' && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>}
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-900">{job.startTime}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900">{job.duration}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900">
                                        {job.reviewsProcessed !== null ? job.reviewsProcessed : '--'}
                                        {job.totalReviews !== null && job.reviewsProcessed !== null && (
                                            <span className="text-gray-400"> / {job.totalReviews}</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            {job.status === 'Failed' && (
                                                <>
                                                    <button className="text-xs font-semibold text-red-600 hover:text-red-700 uppercase">Retry</button>
                                                    <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                                        <RotateCcw size={14} />
                                                    </button>
                                                </>
                                            )}
                                            {job.status === 'Completed' && (
                                                <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                                    <Eye size={16} />
                                                </button>
                                            )}
                                            {job.status === 'Running' && (
                                                <span className="text-xs text-blue-600 font-medium">Processing...</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Showing {filteredJobs.length} of {jobs.length} jobs</span>
                    <div className="flex items-center gap-1">
                        <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-500 bg-white disabled:opacity-50" disabled>Previous</button>
                        <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium">1</button>
                        <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">2</button>
                        <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">3</button>
                        <span className="px-2 text-gray-500">...</span>
                        <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
