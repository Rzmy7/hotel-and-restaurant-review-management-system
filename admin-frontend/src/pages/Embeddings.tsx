import React, { useState, useEffect } from 'react';
import {
    Database,
    Settings2,
    RefreshCw,
    Pause,
    Play,
    Loader
} from 'lucide-react';
import {
    getThresholds,
    updateThresholds,
    resetThresholds,
    getRecentJobs,
    getDatabaseStats,
    reindexDatabase,
    pauseService,
    resumeService,
    getServiceStatus
} from '../services/embeddingService';
import type { SimilarityThresholds, EmbeddingJob, VectorDbStats } from '../services/embeddingService';
import { triggerPendingEmbeddings } from '../services/adminDataService';

export const Embeddings: React.FC = () => {
    const [thresholds, setThresholds] = useState<SimilarityThresholds>({
        oneWord: 1.3,
        twoWords: 1.2,
        threeOrMore: 1.1,
    });
    const [vectorDb, setVectorDb] = useState<VectorDbStats | null>(null);
    const [jobs, setJobs] = useState<EmbeddingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveTimeout, setSaveTimeout] = useState<number | null>(null);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [pauseLoading, setPauseLoading] = useState(false);
    const [triggering, setTriggering] = useState(false);

    // Load initial data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [thresholdsData, jobsData, dbStats, serviceStatus] = await Promise.all([
                    getThresholds(),
                    getRecentJobs(10),
                    getDatabaseStats(),
                    getServiceStatus()
                ]);
                setThresholds(thresholdsData);
                setJobs(jobsData);
                setVectorDb(dbStats);
                setIsPaused(serviceStatus.isPaused);
                setError(null);
            } catch (err) {
                console.error('Failed to load data:', err);
                setError('Failed to load data from server. Using defaults.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    // Auto-refresh jobs and database stats every 5 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const [jobsData, dbStats, serviceStatus] = await Promise.all([
                    getRecentJobs(10),
                    getDatabaseStats(),
                    getServiceStatus()
                ]);
                setJobs(jobsData);
                setVectorDb(dbStats);
                setIsPaused(serviceStatus.isPaused);
            } catch (err) {
                console.error('Failed to refresh data:', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Save thresholds with debouncing
    const handleThresholdChange = (newThresholds: SimilarityThresholds) => {
        setThresholds(newThresholds);

        // Clear existing timeout
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Set new timeout to save after 1 second of inactivity
        const timeout = setTimeout(async () => {
            try {
                setSaving(true);
                await updateThresholds(newThresholds);
                setError(null);
            } catch (err) {
                console.error('Failed to save thresholds:', err);
                setError('Failed to save thresholds. Please try again.');
            } finally {
                setSaving(false);
            }
        }, 1000);

        setSaveTimeout(timeout);
    };

    const handleResetThresholds = async () => {
        try {
            setSaving(true);
            const defaultThresholds = await resetThresholds();
            setThresholds(defaultThresholds);
            setError(null);
        } catch (err) {
            console.error('Failed to reset thresholds:', err);
            setError('Failed to reset thresholds. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleRefreshJobs = async () => {
        try {
            setJobsLoading(true);
            const jobsData = await getRecentJobs(10);
            setJobs(jobsData);
        } catch (err) {
            console.error('Failed to refresh jobs:', err);
            setError('Failed to refresh jobs.');
        } finally {
            setJobsLoading(false);
        }
    };

    const handleReindex = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to re-index all vectors? ' +
            'This will re-generate embeddings for all documents using the MiniLM model. ' +
            'This may take several minutes depending on the number of vectors.'
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError(null);

            const result = await reindexDatabase();

            // Refresh database stats to show updated info
            const dbStats = await getDatabaseStats();
            setVectorDb(dbStats);

            alert(`Successfully re-indexed ${result.vectorsReindexed.toLocaleString()} vectors using MiniLM model.`);
        } catch (err) {
            console.error('Failed to re-index database:', err);
            setError('Failed to re-index database. Please check the logs and try again.');
        } finally {
            setSaving(false);
        }
    };

    const handlePauseService = async () => {
        try {
            setPauseLoading(true);
            setError(null);
            await pauseService();
            setIsPaused(true);
        } catch (err) {
            console.error('Failed to pause service:', err);
            setError('Failed to pause embedding service. Please try again.');
        } finally {
            setPauseLoading(false);
        }
    };

    const handleResumeService = async () => {
        try {
            setPauseLoading(true);
            setError(null);
            await resumeService();
            setIsPaused(false);
        } catch (err) {
            console.error('Failed to resume service:', err);
            setError('Failed to resume embedding service. Please try again.');
        } finally {
            setPauseLoading(false);
        }
    };

    const handleTriggerPending = async () => {
        try {
            setTriggering(true);
            setError(null);
            const response = await triggerPendingEmbeddings();
            alert(`Successfully triggered embedding for ${response.triggered_sources_count} sources.`);
            handleRefreshJobs();
        } catch (err) {
            console.error('Failed to trigger pending embeddings:', err);
            setError('Failed to trigger pending embeddings. Please check the logs.');
        } finally {
            setTriggering(false);
        }
    };

    return (
        <div className="space-y-6 pt-4">
            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            {/* Service Status & Control */}
            <div className={`rounded-xl shadow-sm border p-6 ${isPaused ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isPaused ? 'bg-yellow-100' : 'bg-green-100'}`}>
                            {isPaused ? (
                                <Pause size={20} className="text-yellow-600" />
                            ) : (
                                <Play size={20} className="text-green-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Embedding Service Control</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                {isPaused
                                    ? 'Service is paused. All embedding operations are on hold and will resume from where they stopped.'
                                    : 'Service is running. Embedding operations are being processed normally.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-4">
                            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`}></div>
                            <span className={`text-sm font-medium ${isPaused ? 'text-yellow-700' : 'text-green-700'}`}>
                                {isPaused ? 'Paused' : 'Running'}
                            </span>
                        </div>
                        {isPaused ? (
                            <button
                                onClick={handleResumeService}
                                disabled={pauseLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pauseLoading ? (
                                    <Loader size={16} className="animate-spin" />
                                ) : (
                                    <Play size={16} />
                                )}
                                Resume Service
                            </button>
                        ) : (
                            <button
                                onClick={handlePauseService}
                                disabled={pauseLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pauseLoading ? (
                                    <Loader size={16} className="animate-spin" />
                                ) : (
                                    <Pause size={16} />
                                )}
                                Pause Service
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Vector Database & Similarity Thresholds Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Vector Database */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Database size={20} className="text-blue-500" />
                            <h3 className="text-base font-semibold text-gray-900">Vector Database</h3>
                        </div>
                        {vectorDb && (
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 ${vectorDb.isHealthy ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></span>
                                <span className={`text-sm ${vectorDb.isHealthy ? 'text-green-600' : 'text-red-600'} font-medium`}>
                                    {vectorDb.isHealthy ? 'Healthy' : 'Unhealthy'}
                                </span>
                            </div>
                        )}
                    </div>

                    {vectorDb ? (
                        <>
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Vectors</div>
                                    <div className="text-xl font-bold text-gray-900">{vectorDb.totalVectors.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Namespace</div>
                                    <div className="text-xl font-bold text-gray-900">{vectorDb.namespace}</div>
                                </div>
                            </div>

                            {/* Additional Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Dimensions</div>
                                    <div className="text-sm font-semibold text-gray-900">{vectorDb.dimensions}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Index Type</div>
                                    <div className="text-sm font-semibold text-gray-900">{vectorDb.indexType}</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <div className="text-xs text-gray-500 mb-1">Storage</div>
                                    <div className="text-sm font-semibold text-gray-900">{vectorDb.storage}</div>
                                </div>
                            </div>

                            {/* Re-index & Force Embed Action buttons */}
                            <div className="flex items-center justify-end gap-4 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    onClick={handleTriggerPending}
                                    disabled={triggering || !vectorDb}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Manually trigger embedding for all new, processed reviews that haven't been embedded yet."
                                >
                                    {triggering ? (
                                        <Loader size={16} className="animate-spin" />
                                    ) : (
                                        <Play size={16} />
                                    )}
                                    Embed All
                                </button>
                                <button
                                    onClick={handleReindex}
                                    disabled={saving || !vectorDb}
                                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Re-generate embeddings for all documents. This is a heavy operation."
                                >
                                    <RefreshCw size={16} className={saving ? 'animate-spin' : ''} />
                                    Re-index All
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-32">
                            <Loader size={24} className="animate-spin text-gray-400" />
                        </div>
                    )}
                </div>

                {/* Similarity Thresholds */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Settings2 size={20} className="text-blue-500" />
                            <h3 className="text-base font-semibold text-gray-900">Similarity Thresholds</h3>
                            {saving && (
                                <Loader size={16} className="animate-spin text-blue-500" />
                            )}
                        </div>
                        <button
                            onClick={handleResetThresholds}
                            disabled={saving || loading}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                        >
                            Reset to Default
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader size={24} className="animate-spin text-blue-500" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 1 Word Match */}
                            <div>
                                <label className="text-sm font-medium text-gray-700">1 Word Match</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="2"
                                    value={thresholds.oneWord}
                                    onChange={(e) => handleThresholdChange({ ...thresholds, oneWord: parseFloat(e.target.value) || 0 })}
                                    disabled={saving}
                                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Distance threshold for single word matches. Lower is stricter.</p>
                            </div>

                            {/* 2 Words Match */}
                            <div>
                                <label className="text-sm font-medium text-gray-700">2-3 Words Match</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="2"
                                    value={thresholds.twoWords}
                                    onChange={(e) => handleThresholdChange({ ...thresholds, twoWords: parseFloat(e.target.value) || 0 })}
                                    disabled={saving}
                                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Distance threshold for two-three word phrase matches.</p>
                            </div>

                            {/* 3+ Words Match */}
                            <div>
                                <label className="text-sm font-medium text-gray-700">3+ Words Match</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="2"
                                    value={thresholds.threeOrMore}
                                    onChange={(e) => handleThresholdChange({ ...thresholds, threeOrMore: parseFloat(e.target.value) || 0 })}
                                    disabled={saving}
                                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                />
                                <p className="text-xs text-gray-500 mt-1">Distance threshold for longer phrase matches.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Embedding Jobs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-6 pb-4">
                    <h3 className="text-base font-semibold text-gray-900">Recent Embedding Jobs</h3>
                    <button
                        onClick={handleRefreshJobs}
                        disabled={jobsLoading}
                        className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={jobsLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {jobs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p>No embedding jobs yet. Jobs will appear here when you start embedding reviews or regulations.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-y border-gray-100">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {jobs.map((job) => (
                                <tr key={job.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{job.jobId}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${job.type === 'Review'
                                                ? 'bg-purple-100 text-purple-600'
                                                : 'bg-orange-100 text-orange-600'
                                            }`}>
                                            {job.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-medium ${job.status === 'Completed' ? 'text-green-600' :
                                                job.status === 'Failed' ? 'text-red-500' :
                                                    job.status === 'Paused' ? 'text-yellow-600' :
                                                        'text-blue-500'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${job.status === 'Completed' ? 'bg-green-500' :
                                                            job.status === 'Failed' ? 'bg-red-500' :
                                                                job.status === 'Paused' ? 'bg-yellow-500' :
                                                                    'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${job.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-600">{job.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{job.duration}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{job.timestamp}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
