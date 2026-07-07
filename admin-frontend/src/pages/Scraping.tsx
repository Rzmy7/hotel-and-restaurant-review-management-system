import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Play, CheckCircle, XCircle, Grid3X3, Plus, X, Trash2, Upload, Pencil } from 'lucide-react';
import { Alert } from '../components/Alert';
import { ToggleSwitch } from '../components/ToggleSwitch';
import Skeleton from '../components/shared/Skeleton';
import ScrapingSkeleton from './ScrapingSkeleton';
import { fetchScrapingStats, fetchScrapingPlatforms, fetchScrapingJobs, createScrapingPlatform, deleteScrapingPlatform, fetchScrapingPlatformDetails, updateScrapingPlatform, uploadPlatformScript, toggleScrapingPlatform } from '../services/scrapingService';
import type { ScrapingStats, ScrapingPlatform, ScrapingJob } from '../types';
import { useSystemTimezone } from '../hooks/useSystemTimezone';
import { formatDateTime } from '../utils/dateTime';

type TableAttributeFormRow = {
    name: string;
    type: string;
    nullable: boolean;
};

const defaultPlatformForm = {
    name: '',
    tableName: '',
    attributes: [{ name: '', type: 'NVARCHAR(255)', nullable: true }] as TableAttributeFormRow[],
    baseUrl: '',
    enabled: true,
};

export const Scraping: React.FC = () => {
    const systemTimezone = useSystemTimezone();
    const [stats, setStats] = useState<ScrapingStats | null>(null);
    const [platforms, setPlatforms] = useState<ScrapingPlatform[]>([]);
    const [jobs, setJobs] = useState<ScrapingJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [jobsLoading, setJobsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddPlatformOpen, setIsAddPlatformOpen] = useState(false);
    const [addPlatformSubmitting, setAddPlatformSubmitting] = useState(false);
    const [addPlatformError, setAddPlatformError] = useState<string | null>(null);
    const [platformForm, setPlatformForm] = useState(defaultPlatformForm);
    const [addPlatformFile, setAddPlatformFile] = useState<File | null>(null);
    const [isEditPlatformOpen, setIsEditPlatformOpen] = useState(false);
    const [editPlatformId, setEditPlatformId] = useState<string | null>(null);
    const [editPlatformLoading, setEditPlatformLoading] = useState(false);
    const [editPlatformSubmitting, setEditPlatformSubmitting] = useState(false);
    const [editPlatformError, setEditPlatformError] = useState<string | null>(null);
    const [editPlatformForm, setEditPlatformForm] = useState(defaultPlatformForm);
    const [editPlatformFile, setEditPlatformFile] = useState<File | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [reloadCounter, setReloadCounter] = useState(0);
    const itemsPerPage = 10;
    const [globalFrequency, setGlobalFrequency] = useState('Daily (24h)');
    // const [stoppingJobIds, setStoppingJobIds] = useState<Set<string>>(new Set());

    // Reset modal file state whenever the Add Platform modal closes.
    useEffect(() => {
        if (!isAddPlatformOpen) {
            setAddPlatformFile(null);
            setAddPlatformError(null);
            setPlatformForm(defaultPlatformForm);
        }
    }, [isAddPlatformOpen]);

    useEffect(() => {
        if (!isEditPlatformOpen) {
            setEditPlatformId(null);
            setEditPlatformFile(null);
            setEditPlatformError(null);
            setEditPlatformLoading(false);
            setEditPlatformForm(defaultPlatformForm);
        }
    }, [isEditPlatformOpen]);

    // Load static components (stats & platforms)
    useEffect(() => {
        const loadStaticData = async (isSilent = false) => {
            try {
                if (!isSilent) {
                    setLoading(true);
                }
                const [statsResult, platformsResult] = await Promise.allSettled([
                    fetchScrapingStats(),
                    fetchScrapingPlatforms(),
                ]);

                if (statsResult.status === 'fulfilled') setStats(statsResult.value);
                if (platformsResult.status === 'fulfilled') setPlatforms(platformsResult.value);

                const errors: string[] = [];
                if (platformsResult.status === 'rejected') {
                    errors.push(`Platforms: ${platformsResult.reason instanceof Error ? platformsResult.reason.message : 'failed to load'}`);
                }
                if (statsResult.status === 'rejected') {
                    errors.push('Scraping service is unreachable (stats unavailable).');
                }
                if (errors.length > 0) setError(errors.join(' | '));
            } catch (err) {
                console.error('Failed to load static scraping data:', err);
                setError('Failed to load scraping data. Check admin-backend connectivity.');
            } finally {
                setLoading(false);
            }
        };

        loadStaticData();

        const interval = setInterval(() => {
            loadStaticData(true);
            setReloadCounter(prev => prev + 1);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    // Load paginated & filtered jobs
    useEffect(() => {
        const loadJobsData = async () => {
            setJobsLoading(true);
            try {
                const response = await fetchScrapingJobs(currentPage, itemsPerPage, searchQuery.trim() || undefined);
                setJobs(response.data);
                setTotalItems(response.total);
            } catch (err) {
                console.error('Failed to load scraping jobs:', err);
            } finally {
                setJobsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            loadJobsData();
        }, searchQuery ? 300 : 0);

        return () => clearTimeout(timer);
    }, [currentPage, searchQuery, reloadCounter]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setError(null);
            const [statsResult, platformsResult] = await Promise.allSettled([
                fetchScrapingStats(),
                fetchScrapingPlatforms(),
            ]);
            if (statsResult.status === 'fulfilled') setStats(statsResult.value);
            if (platformsResult.status === 'fulfilled') setPlatforms(platformsResult.value);
            if (platformsResult.status === 'rejected') {
                setError(`Platforms: ${platformsResult.reason instanceof Error ? platformsResult.reason.message : 'failed to load'}`);
            }
            setReloadCounter(prev => prev + 1);
        } catch (err) {
            console.error('Failed to refresh scraping data:', err);
            setError('Failed to refresh scraping data.');
        } finally {
            setRefreshing(false);
        }
    };

    const togglePlatform = async (id: string) => {
        // Optimistic update.
        setPlatforms(prev => prev.map(p =>
            p.id === id ? { ...p, enabled: !p.enabled, status: p.enabled ? 'maintenance' : 'active' } : p
        ));
        try {
            const updated = await toggleScrapingPlatform(id);
            // Sync with confirmed server value.
            setPlatforms(prev => prev.map(p =>
                p.id === id ? { ...p, enabled: updated.enabled, status: updated.status } : p
            ));
        } catch (err) {
            // Rollback on failure.
            setPlatforms(prev => prev.map(p =>
                p.id === id ? { ...p, enabled: !p.enabled, status: p.enabled ? 'active' : 'maintenance' } : p
            ));
            console.error('Failed to toggle platform:', err);
            setError(err instanceof Error ? err.message : 'Failed to toggle platform.');
        }
    };

    const handleDeletePlatform = async (id: string, name: string) => {
        if (!window.confirm(`Remove platform "${name}"? This cannot be undone.`)) {
            return;
        }
        try {
            await deleteScrapingPlatform(id);
            setPlatforms(prev => prev.filter(p => p.id !== id));
        } catch (err) {
            console.error('Failed to delete platform:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete platform.');
        }
    };

    const normalizePlatformAttributes = (rows: TableAttributeFormRow[]) => {
        const normalizedAttributes = rows
            .map((attr) => ({
                name: attr.name.trim(),
                type: attr.type.trim(),
                nullable: attr.nullable,
            }))
            .filter((attr) => attr.name || attr.type);

        if (normalizedAttributes.length === 0) {
            return {
                attributes: null,
                error: 'At least one table attribute is required.',
            };
        }
        if (normalizedAttributes.some((attr) => !attr.name || !attr.type)) {
            return {
                attributes: null,
                error: 'Each table attribute must include both name and type.',
            };
        }

        return {
            attributes: normalizedAttributes,
            error: null,
        };
    };

    const openEditPlatformModal = async (platform: ScrapingPlatform) => {
        setIsEditPlatformOpen(true);
        setEditPlatformId(platform.id);
        setEditPlatformLoading(true);
        setEditPlatformError(null);
        setEditPlatformFile(null);

        setEditPlatformForm({
            name: platform.name,
            tableName: (platform.tableName || '').trim(),
            attributes: Array.isArray(platform.attributes) && platform.attributes.length > 0
                ? platform.attributes.map((attr) => ({
                    name: attr.name,
                    type: attr.type,
                    nullable: attr.nullable,
                }))
                : [{ name: '', type: 'NVARCHAR(255)', nullable: true }],
            baseUrl: platform.baseUrl || '',
            enabled: platform.enabled,
        });

        try {
            const details = await fetchScrapingPlatformDetails(platform.id);
            setEditPlatformForm((previous) => ({
                name: details.name || previous.name,
                tableName: details.tableName || previous.tableName,
                attributes: details.attributes.length > 0
                    ? details.attributes.map((attr) => ({
                        name: attr.name,
                        type: attr.type,
                        nullable: attr.nullable,
                    }))
                    : previous.attributes,
                baseUrl: details.baseUrl || previous.baseUrl,
                enabled: typeof details.enabled === 'boolean' ? details.enabled : previous.enabled,
            }));
        } catch (err) {
            console.error('Failed to load platform details:', err);
            setEditPlatformError(err instanceof Error ? err.message : 'Failed to load platform details.');
        } finally {
            setEditPlatformLoading(false);
        }
    };

    const handleUpdatePlatform = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editPlatformId) {
            setEditPlatformError('No platform selected.');
            return;
        }
        if (!editPlatformForm.name.trim()) {
            setEditPlatformError('Platform name is required.');
            return;
        }
        if (!editPlatformForm.tableName.trim()) {
            setEditPlatformError('Table name is required.');
            return;
        }

        const normalized = normalizePlatformAttributes(editPlatformForm.attributes);
        if (normalized.error) {
            setEditPlatformError(normalized.error);
            return;
        }
        if (!normalized.attributes) {
            setEditPlatformError('At least one table attribute is required.');
            return;
        }

        try {
            setEditPlatformSubmitting(true);
            setEditPlatformError(null);

            const updatedPlatform = await updateScrapingPlatform(editPlatformId, {
                name: editPlatformForm.name.trim(),
                tableName: editPlatformForm.tableName.trim(),
                attributes: normalized.attributes,
                baseUrl: editPlatformForm.baseUrl.trim() || undefined,
                enabled: editPlatformForm.enabled,
            });

            setPlatforms(prev => prev.map((platform) => (
                platform.id === editPlatformId
                    ? {
                        ...platform,
                        ...updatedPlatform,
                    }
                    : platform
            )));

            if (editPlatformFile) {
                try {
                    await uploadPlatformScript(editPlatformId, updatedPlatform.name, editPlatformFile);
                } catch (uploadErr) {
                    console.error('Failed to upload scraping file:', uploadErr);
                    setEditPlatformError(uploadErr instanceof Error ? uploadErr.message : 'Platform updated, but scraping file upload failed.');
                    setEditPlatformSubmitting(false);
                    return;
                }
            }

            setIsEditPlatformOpen(false);
        } catch (err) {
            console.error('Failed to update platform:', err);
            setEditPlatformError(err instanceof Error ? err.message : 'Failed to update platform.');
        } finally {
            setEditPlatformSubmitting(false);
        }
    };

    const handleCreatePlatform = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!platformForm.name.trim()) {
            setAddPlatformError('Platform name is required.');
            return;
        }
        if (!platformForm.tableName.trim()) {
            setAddPlatformError('Table name is required.');
            return;
        }

        const normalized = normalizePlatformAttributes(platformForm.attributes);
        if (normalized.error) {
            setAddPlatformError(normalized.error);
            return;
        }
        if (!normalized.attributes) {
            setAddPlatformError('At least one table attribute is required.');
            return;
        }

        try {
            setAddPlatformSubmitting(true);
            setAddPlatformError(null);
            const createdPlatform = await createScrapingPlatform({
                name: platformForm.name.trim(),
                tableName: platformForm.tableName.trim(),
                attributes: normalized.attributes,
                baseUrl: platformForm.baseUrl.trim() || undefined,
                enabled: platformForm.enabled,
            });

            setPlatforms(prev => [...prev, createdPlatform]);

            if (addPlatformFile) {
                try {
                    await uploadPlatformScript(createdPlatform.id, createdPlatform.name, addPlatformFile);
                } catch (uploadErr) {
                    console.error('Failed to upload scraping file:', uploadErr);
                    setAddPlatformError(uploadErr instanceof Error ? uploadErr.message : 'Platform created, but scraping file upload failed.');
                    setAddPlatformSubmitting(false);
                    return;
                }
            }

            setIsAddPlatformOpen(false);
        } catch (err) {
            console.error('Failed to create platform:', err);
            setAddPlatformError(err instanceof Error ? err.message : 'Failed to create platform.');
        } finally {
            setAddPlatformSubmitting(false);
        }
    };

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedJobs = jobs;

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
            default: return 'bg-gray-100 text-gray-700 dark:text-slate-200';
        }
    };

    /*
    const handleStopJob = async (job: ScrapingJob) => {
        if (stoppingJobIds.has(job.id)) return;
        setStoppingJobIds(prev => new Set(prev).add(job.id));
        try {
            await stopScrapingJob(job.id);
            // Optimistically update the job status in local state
            setJobs(prev => prev.map(j =>
                j.id === job.id ? { ...j, status: 'Failed' as const } : j
            ));
        } catch (err) {
            console.error('Failed to stop job:', err);
            setError(err instanceof Error ? err.message : 'Failed to stop job.');
        } finally {
            setStoppingJobIds(prev => {
                const next = new Set(prev);
                next.delete(job.id);
                return next;
            });
        }
    };
    */

    if (loading) {
        return <ScrapingSkeleton />;
    }

    return (
        <div className="space-y-6 pt-4">
            {error && (
                <Alert type="error" message={error} onClose={() => setError(null)} />
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Active Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <Play size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeJobs}</div>
                    <div className="text-xs text-green-600">+{stats?.activeJobsChange} since last hour</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Completed Today</span>
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.completedToday.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{stats?.successRate}% success rate</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Failed Jobs</span>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                            <XCircle size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.failedJobs}</div>
                    <div className="text-xs text-red-600">Requires attention</div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Reviews Ingested</span>
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                            <Grid3X3 size={16} />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats?.reviewsIngested || 0)}</div>
                    <div className="text-xs text-green-600">+{stats?.reviewsChange}% vs last week</div>
                </div>
            </div>

            {/* Platform Configuration */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Platform Configuration</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Configure scraper status and frequency settings for supported platforms.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-slate-400">Global Frequency:</span>
                        <button
                            onClick={() => setIsAddPlatformOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                        >
                            <Plus size={16} />
                            Add Platform
                        </button>
                        <select 
                            value={globalFrequency} 
                            onChange={(e) => setGlobalFrequency(e.target.value)}
                            className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white bg-white dark:bg-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option>Daily (24h)</option>
                            <option>Hourly</option>
                            <option>Every 6 hours</option>
                            <option>Every 12 hours</option>
                            <option>Weekly</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-4 flex-wrap">
                    {platforms.map(platform => (
                        <div 
                            key={platform.id} 
                            className={`flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-slate-900 rounded-xl min-w-[200px] ${platform.status === 'maintenance' ? 'opacity-70' : ''}`}
                        >
                            <div 
                                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                style={{ backgroundColor: platform.color }}
                            >
                                {platform.icon}
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">{platform.name}</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                    {platform.status === 'maintenance' ? 'Maintenance Mode' : `Last run: ${formatDateTime(platform.lastRun, systemTimezone)}`}
                                </span>
                            </div>
                            <ToggleSwitch
                                checked={platform.enabled}
                                onChange={() => togglePlatform(platform.id)}
                            />
                            <button
                                onClick={() => openEditPlatformModal(platform)}
                                title="Edit platform"
                                aria-label="Edit platform"
                                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                                <Pencil size={16} />
                            </button>
                            <button
                                onClick={() => handleDeletePlatform(platform.id, platform.name)}
                                title="Remove platform"
                                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {isAddPlatformOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddPlatformOpen(false)} />
                    <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-800 shadow-xl mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Add New Platform</h3>
                            <button onClick={() => setIsAddPlatformOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePlatform} className="p-5 space-y-4">
                            {addPlatformError && (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {addPlatformError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Platform Name</label>
                                <input
                                    type="text"
                                    required
                                    value={platformForm.name}
                                    onChange={(e) => setPlatformForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Expedia"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Base URL</label>
                                <input
                                    type="url"
                                    value={platformForm.baseUrl}
                                    onChange={(e) => setPlatformForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                                    placeholder="https://www.example.com"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Optional, but useful for organization-source linking.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Table Name</label>
                                <input
                                    type="text"
                                    required
                                    value={platformForm.tableName}
                                    onChange={(e) => setPlatformForm(prev => ({ ...prev, tableName: e.target.value }))}
                                    placeholder="e.g. expedia_reviews"
                                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Use letters, numbers, and underscores only.</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Table Attributes</label>
                                    <button
                                        type="button"
                                        onClick={() => setPlatformForm(prev => ({
                                            ...prev,
                                            attributes: [...prev.attributes, { name: '', type: 'NVARCHAR(255)', nullable: true }],
                                        }))}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                    >
                                        <Plus size={14} />
                                        Add Attribute
                                    </button>
                                </div>

                                {platformForm.attributes.map((attr, index) => (
                                    <div key={`${index}-${attr.name}`} className="grid grid-cols-12 gap-2 items-center">
                                        <input
                                            type="text"
                                            value={attr.name}
                                            onChange={(e) => setPlatformForm(prev => ({
                                                ...prev,
                                                attributes: prev.attributes.map((row, rowIndex) => (
                                                    rowIndex === index ? { ...row, name: e.target.value } : row
                                                )),
                                            }))}
                                            placeholder="column_name"
                                            className="col-span-5 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="text"
                                            value={attr.type}
                                            onChange={(e) => setPlatformForm(prev => ({
                                                ...prev,
                                                attributes: prev.attributes.map((row, rowIndex) => (
                                                    rowIndex === index ? { ...row, type: e.target.value } : row
                                                )),
                                            }))}
                                            placeholder="NVARCHAR(255)"
                                            className="col-span-4 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="col-span-2 inline-flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                            <input
                                                type="checkbox"
                                                checked={attr.nullable}
                                                onChange={(e) => setPlatformForm(prev => ({
                                                    ...prev,
                                                    attributes: prev.attributes.map((row, rowIndex) => (
                                                        rowIndex === index ? { ...row, nullable: e.target.checked } : row
                                                    )),
                                                }))}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            Null
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setPlatformForm(prev => ({
                                                ...prev,
                                                attributes: prev.attributes.filter((_, rowIndex) => rowIndex !== index),
                                            }))}
                                            disabled={platformForm.attributes.length <= 1}
                                            className="col-span-1 inline-flex justify-center text-gray-400 dark:text-slate-500 hover:text-red-600 disabled:opacity-30"
                                            title="Remove attribute"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}

                                <p className="text-xs text-gray-500 dark:text-slate-400">Examples: INT, BIGINT, BIT, DATE, DATETIME, DECIMAL(10,2), VARCHAR(255), NVARCHAR(255)</p>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={platformForm.enabled}
                                    onChange={(e) => setPlatformForm(prev => ({ ...prev, enabled: e.target.checked }))}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Enable platform immediately
                            </label>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                                    Scraping Script <span className="font-normal text-gray-400 dark:text-slate-500">(optional)</span>
                                </label>
                                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => setAddPlatformFile(e.target.files?.[0] ?? null)}
                                    />
                                    {addPlatformFile
                                        ? <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium"><Upload size={13} />{addPlatformFile.name}</span>
                                        : <span className="flex items-center gap-1.5"><Upload size={14} />Click to upload scraping file</span>
                                    }
                                </label>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={addPlatformSubmitting}
                                    onClick={() => setIsAddPlatformOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={addPlatformSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                                >
                                    {addPlatformSubmitting ? 'Adding...' : 'Add Platform'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isEditPlatformOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => !editPlatformSubmitting && setIsEditPlatformOpen(false)} />
                    <div className="relative w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 shadow-xl mx-4">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Edit Platform</h3>
                            <button
                                disabled={editPlatformSubmitting}
                                onClick={() => setIsEditPlatformOpen(false)}
                                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 disabled:opacity-40"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {editPlatformLoading ? (
                            <div className="p-5 space-y-5">
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-28 rounded" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-20 rounded" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 w-24 rounded" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Skeleton className="h-4 w-28 rounded" />
                                        <Skeleton className="h-4 w-16 rounded" />
                                    </div>
                                    <div className="flex gap-2">
                                        <Skeleton className="h-10 flex-1 rounded-lg" />
                                        <Skeleton className="h-10 w-32 rounded-lg" />
                                        <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
                                    <Skeleton className="h-9 w-20 rounded-lg" />
                                    <Skeleton className="h-9 w-24 rounded-lg" />
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePlatform} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                                {editPlatformError && (
                                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {editPlatformError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Platform Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editPlatformForm.name}
                                        onChange={(e) => setEditPlatformForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. Expedia"
                                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Base URL</label>
                                    <input
                                        type="url"
                                        value={editPlatformForm.baseUrl}
                                        onChange={(e) => setEditPlatformForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                                        placeholder="https://www.example.com"
                                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">Table Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editPlatformForm.tableName}
                                        onChange={(e) => setEditPlatformForm(prev => ({ ...prev, tableName: e.target.value }))}
                                        placeholder="e.g. expedia_reviews"
                                        className="w-full px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Use letters, numbers, and underscores only.</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">Table Attributes</label>
                                        <button
                                            type="button"
                                            onClick={() => setEditPlatformForm(prev => ({
                                                ...prev,
                                                attributes: [...prev.attributes, { name: '', type: 'NVARCHAR(255)', nullable: true }],
                                            }))}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            <Plus size={14} />
                                            Add Attribute
                                        </button>
                                    </div>

                                    {editPlatformForm.attributes.map((attr, index) => (
                                        <div key={`${index}-${attr.name}`} className="grid grid-cols-12 gap-2 items-center">
                                            <input
                                                type="text"
                                                value={attr.name}
                                                onChange={(e) => setEditPlatformForm(prev => ({
                                                    ...prev,
                                                    attributes: prev.attributes.map((row, rowIndex) => (
                                                        rowIndex === index ? { ...row, name: e.target.value } : row
                                                    )),
                                                }))}
                                                placeholder="column_name"
                                                className="col-span-5 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <input
                                                type="text"
                                                value={attr.type}
                                                onChange={(e) => setEditPlatformForm(prev => ({
                                                    ...prev,
                                                    attributes: prev.attributes.map((row, rowIndex) => (
                                                        rowIndex === index ? { ...row, type: e.target.value } : row
                                                    )),
                                                }))}
                                                placeholder="NVARCHAR(255)"
                                                className="col-span-4 px-3 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <label className="col-span-2 inline-flex items-center justify-center gap-1 text-xs text-gray-600 dark:text-slate-400">
                                                <input
                                                    type="checkbox"
                                                    checked={attr.nullable}
                                                    onChange={(e) => setEditPlatformForm(prev => ({
                                                        ...prev,
                                                        attributes: prev.attributes.map((row, rowIndex) => (
                                                            rowIndex === index ? { ...row, nullable: e.target.checked } : row
                                                        )),
                                                    }))}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                Null
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setEditPlatformForm(prev => ({
                                                    ...prev,
                                                    attributes: prev.attributes.filter((_, rowIndex) => rowIndex !== index),
                                                }))}
                                                disabled={editPlatformForm.attributes.length <= 1}
                                                className="col-span-1 inline-flex justify-center text-gray-400 dark:text-slate-500 hover:text-red-600 disabled:opacity-30"
                                                title="Remove attribute"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}

                                    <p className="text-xs text-gray-500 dark:text-slate-400">Examples: INT, BIGINT, BIT, DATE, DATETIME, DECIMAL(10,2), VARCHAR(255), NVARCHAR(255)</p>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
                                    <input
                                        type="checkbox"
                                        checked={editPlatformForm.enabled}
                                        onChange={(e) => setEditPlatformForm(prev => ({ ...prev, enabled: e.target.checked }))}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Enable platform
                                </label>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-200 mb-1.5">
                                        Upload New Scraping File <span className="font-normal text-gray-400 dark:text-slate-500">(optional)</span>
                                    </label>
                                    <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 cursor-pointer transition-colors">
                                        <input
                                            type="file"
                                            className="hidden"
                                            onChange={(e) => setEditPlatformFile(e.target.files?.[0] ?? null)}
                                        />
                                        {editPlatformFile
                                            ? <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium"><Upload size={13} />{editPlatformFile.name}</span>
                                            : <span className="flex items-center gap-1.5"><Upload size={14} />Click to upload new scraping file</span>
                                        }
                                    </label>
                                </div>

                                <div className="flex items-center gap-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={editPlatformSubmitting}
                                        onClick={() => setIsEditPlatformOpen(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editPlatformSubmitting || !editPlatformId}
                                        className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-60"
                                    >
                                        {editPlatformSubmitting ? 'Saving...' : 'Update Platform'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Job Status Table */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Job Status Table</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Real-time monitoring of all active and recent scraping jobs.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Job ID or Org..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
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
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Reviews</th>

                            </tr>
                        </thead>
                        <tbody>
                            {paginatedJobs.map(job => (
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
                                            {job.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{formatDateTime(job.startTime, systemTimezone)}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{job.duration}</td>
                                    <td className="py-4 px-4 text-sm text-gray-900 dark:text-white">{job.reviews !== null ? job.reviews : '--'}</td>

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
                                                : 'border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 dark:bg-slate-900'
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
