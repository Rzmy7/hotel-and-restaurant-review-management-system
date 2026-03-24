import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { OrganizationStatsGrid } from '../components/OrganizationStatsGrid';
import { OrganizationFilters } from '../components/OrganizationFilters';
import { OrganizationTable } from '../components/OrganizationTable';
import {
    fetchOrganizations,
    fetchOrgStats,
    fetchOrgSources,
    fetchAllSources,
    updateOrganization,
    updateOrgSources,
    deleteOrganization,
} from '../services/adminDataService';
import type { AvailableSource, Organization, OrganizationStats, OrgSource } from '../types';

export const Organizations: React.FC = () => {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<OrganizationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Status');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const [editOrg, setEditOrg] = useState<Organization | null>(null);
    const [editName, setEditName] = useState('');
    const [editSources, setEditSources] = useState<OrgSource[]>([]);
    const [availableSources, setAvailableSources] = useState<AvailableSource[]>([]);
    const [editLoading, setEditLoading] = useState(false);
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [sourceUrls, setSourceUrls] = useState<Record<number, string>>({});
    const [addSourceId, setAddSourceId] = useState<number | ''>('');
    const [addSourceUrl, setAddSourceUrl] = useState('');

    const [deleteOrg, setDeleteOrg] = useState<Organization | null>(null);
    const [deleteInProgress, setDeleteInProgress] = useState(false);

    const addSelectRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [orgData, statsData] = await Promise.all([
                    fetchOrganizations(),
                    fetchOrgStats(),
                ]);
                setOrgs(orgData);
                setStats(statsData);
            } catch (error) {
                console.error('Failed to load organizations data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleOpenEdit = async (org: Organization) => {
        setEditOrg(org);
        setEditName(org.name);
        setEditSources([]);
        setSourceUrls({});
        setAddSourceId('');
        setAddSourceUrl('');
        setEditError(null);
        setEditLoading(true);

        try {
            const [sources, allSrc] = await Promise.all([
                fetchOrgSources(org.id),
                fetchAllSources(),
            ]);
            setEditSources(sources);
            const urlMap: Record<number, string> = {};
            sources.forEach((s) => {
                urlMap[s.source_id] = s.external_url ?? '';
            });
            setSourceUrls(urlMap);
            setAvailableSources(allSrc);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to load sources.');
        } finally {
            setEditLoading(false);
        }
    };

    const handleCloseEdit = () => {
        setEditOrg(null);
        setEditError(null);
    };

    const handleSaveEdit = async () => {
        if (!editOrg) return;
        const trimmedName = editName.trim();
        if (!trimmedName) {
            setEditError('Organization name cannot be empty.');
            return;
        }

        setEditSaving(true);
        setEditError(null);
        try {
            await updateOrganization(editOrg.id, trimmedName);
            const sourcesPayload = editSources.map((s) => ({
                source_id: s.source_id,
                external_url: sourceUrls[s.source_id]?.trim() || null,
            }));
            await updateOrgSources(editOrg.id, sourcesPayload);

            setOrgs((prev) => prev.map((o) =>
                o.id === editOrg.id ? { ...o, name: trimmedName } : o
            ));
            handleCloseEdit();
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Failed to save changes.');
        } finally {
            setEditSaving(false);
        }
    };

    const handleAddSource = () => {
        if (addSourceId === '') return;
        const src = availableSources.find((s) => s.source_id === addSourceId);
        if (!src) return;
        if (editSources.some((s) => s.source_id === addSourceId)) return;

        setEditSources((prev) => [...prev, {
            organization_source_id: -Date.now(),
            source_id: src.source_id,
            platform_name: src.platform_name,
            external_url: addSourceUrl.trim() || null,
            last_synced_at: null,
        }]);
        setSourceUrls((prev) => ({ ...prev, [src.source_id]: addSourceUrl.trim() }));
        setAddSourceId('');
        setAddSourceUrl('');
        addSelectRef.current?.focus();
    };

    const handleRemoveSource = (sourceId: number) => {
        setEditSources((prev) => prev.filter((s) => s.source_id !== sourceId));
        setSourceUrls((prev) => {
            const next = { ...prev };
            delete next[sourceId];
            return next;
        });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteOrg) return;
        setDeleteInProgress(true);
        try {
            await deleteOrganization(deleteOrg.id);
            setOrgs((prev) => prev.filter((o) => o.id !== deleteOrg.id));
            setDeleteOrg(null);
        } catch (err) {
            console.error('Failed to delete organization:', err);
        } finally {
            setDeleteInProgress(false);
        }
    };

    const unusedSources = availableSources.filter(
        (s) => !editSources.some((e) => e.source_id === s.source_id),
    );

    const filteredOrgs = orgs.filter((org) => {
        const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'All Status' || org.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredOrgs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrgs = filteredOrgs.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading) {
        return <LoadingSpinner size={32} />;
    }

    return (
        <div className="space-y-8 pt-4">
            {stats && <OrganizationStatsGrid stats={stats} />}

            <OrganizationFilters
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
                onStatusChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
            />

            <OrganizationTable
                organizations={paginatedOrgs}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredOrgs.length}
                itemsPerPage={itemsPerPage}
                startIndex={startIndex}
                onPageChange={handlePageChange}
                onEdit={handleOpenEdit}
                onDelete={(org) => setDeleteOrg(org)}
            />

            {deleteOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
                        <h2 className="text-base font-semibold text-gray-900">Delete Organization</h2>
                        <p className="text-sm text-gray-600">
                            Are you sure you want to delete <strong>{deleteOrg.name}</strong>?
                            This will also remove all linked source URLs and cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                onClick={() => setDeleteOrg(null)}
                                disabled={deleteInProgress}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={deleteInProgress}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                {deleteInProgress && <Loader2 size={14} className="animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editOrg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                            <h2 className="text-base font-semibold text-gray-900">Edit Organization</h2>
                            <button onClick={handleCloseEdit} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Organization Name</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-2">Source URLs</h3>
                                {editLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                                        <Loader2 size={15} className="animate-spin" /> Loading sources...
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {editSources.length === 0 && (
                                            <p className="text-xs text-gray-400 py-1">No sources linked yet.</p>
                                        )}

                                        {editSources.map((src) => (
                                            <div key={src.source_id} className="flex items-center gap-2">
                                                <span className="w-28 text-xs font-medium text-gray-600 truncate shrink-0">{src.platform_name}</span>
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={sourceUrls[src.source_id] ?? ''}
                                                    onChange={(e) => setSourceUrls((prev) => ({ ...prev, [src.source_id]: e.target.value }))}
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={() => handleRemoveSource(src.source_id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                                    title="Remove source"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        {unusedSources.length > 0 && (
                                            <div className="flex items-center gap-2 pt-1 border-t border-gray-100 mt-2">
                                                <select
                                                    ref={addSelectRef}
                                                    value={addSourceId}
                                                    onChange={(e) => setAddSourceId(e.target.value === '' ? '' : Number(e.target.value))}
                                                    className="w-28 px-2 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                                                >
                                                    <option value="">Platform...</option>
                                                    {unusedSources.map((s) => (
                                                        <option key={s.source_id} value={s.source_id}>{s.platform_name}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="url"
                                                    placeholder="https://..."
                                                    value={addSourceUrl}
                                                    onChange={(e) => setAddSourceUrl(e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    onClick={handleAddSource}
                                                    disabled={addSourceId === ''}
                                                    className="p-1.5 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors shrink-0"
                                                    title="Add source"
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {editError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                    {editError}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                            <button
                                onClick={handleCloseEdit}
                                disabled={editSaving}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={editSaving || editLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                {editSaving && <Loader2 size={14} className="animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};