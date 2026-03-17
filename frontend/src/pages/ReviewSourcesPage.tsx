import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, History, RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { sourcesService } from '../services/sourcesService';
import type { Source, SyncLog, SourceStats as SourceStatsType } from '../types/sources';

// New Components
import SourcesTable from '../components/sources/SourcesTable';
import SourceStats from '../components/sources/SourceStats';
import SyncHistoryPanel from '../components/shared/SyncHistoryPanel';
import AddSourceModal from '../components/sources/AddSourceModal';
import EditSourceModal from '../components/sources/EditSourceModal';

const ReviewSourcesPage = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Temporary hardcoded IDs until context is integrated
  const tenantId = 'D7A3E7C9-8F2B-4B1A-9C1A-1A2B3C4D5E6F';
  const organizationId = 'A1B2C3D4-E5F6-4A1B-8C2D-3E4F5A6B7C8D';

  // React Query: Sources
  const { data: sources = [], isLoading: isLoadingSources, isRefetching: isRefreshingSources } = useQuery({
    queryKey: ['sources', tenantId, organizationId],
    queryFn: () => sourcesService.getSources(tenantId, organizationId),
  });

  // React Query: Stats
  const { data: stats = null, isLoading: isLoadingStats } = useQuery({
    queryKey: ['sourceStats', tenantId, organizationId],
    queryFn: () => sourcesService.getStats(tenantId, organizationId),
  });

  // React Query: Sync Logs (Paginated)
  const { 
    data: infiniteLogs, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: isLoadingLogs 
  } = useInfiniteQuery({
    queryKey: ['syncLogs', tenantId, organizationId],
    queryFn: ({ pageParam = 0 }) => sourcesService.getSyncLogs(tenantId, organizationId, pageParam as number, 10),
    getNextPageParam: (lastPage: SyncLog[], allPages: SyncLog[][]) => lastPage.length === 10 ? allPages.length : undefined,
    initialPageParam: 0,
  });

  const logs = useMemo(() => infiniteLogs?.pages.flat() || [], [infiniteLogs]);

  // Mutations
  const addSourceMutation = useMutation({
    mutationFn: (newSourceData: Partial<Source>) => sourcesService.addSource(tenantId, organizationId, newSourceData as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['sourceStats'] });
      showToast('New source added successfully', 'success');
    },
    onError: () => showToast('Failed to add source', 'error'),
  });

  const updateSourceMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string | number, updates: Partial<Source> }) => sourcesService.updateSource(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      showToast('Source updated successfully', 'success');
    },
    onError: () => showToast('Failed to update source', 'error'),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: (id: string | number) => sourcesService.deleteSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
      queryClient.invalidateQueries({ queryKey: ['sourceStats'] });
      showToast('Source removed successfully', 'info');
    },
    onError: () => showToast('Failed to delete source', 'error'),
  });

  const triggerSyncMutation = useMutation({
    mutationFn: (id: string | number) => sourcesService.triggerSync(id),
    onSuccess: (_: any, id: string | number) => {
      const source = sources.find((s: Source) => s.id === id);
      showToast(`Sync triggered for ${source?.platform || 'source'}`, 'success');
      // Simulate follow up
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['sources'] }), 2000);
    },
    onError: () => showToast('Sync failed', 'error'),
  });

  // Combined Loading States
  const isLoading = isLoadingSources || isLoadingStats || isLoadingLogs;
  const isRefreshing = isRefreshingSources;

  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'settings' | 'analytics'>('settings');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filtered Sources
  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      const matchesSearch = source.platform.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || source.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sources, searchQuery, statusFilter]);

  // Handlers
  const handleAddSource = async (newSourceData: Partial<Source>) => {
    await addSourceMutation.mutateAsync(newSourceData);
    setIsAddModalOpen(false);
  };

  const handleUpdateSource = async (updatedSource: Source) => {
    await updateSourceMutation.mutateAsync({ id: updatedSource.id, updates: updatedSource });
    setIsEditModalOpen(false);
  };

  const handleDeleteSource = async (id: string | number) => {
    await deleteSourceMutation.mutateAsync(id);
    setIsEditModalOpen(false);
  };

  const handleToggleStatus = async (source: Source) => {
    const newStatus = source.status === 'Active' ? 'Paused' : 'Active';
    await updateSourceMutation.mutateAsync({ id: source.id, updates: { status: newStatus } });
  };

  const handleSyncNow = async (id: string | number) => {
    triggerSyncMutation.mutate(id);
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Redesigned Header - Sophisticated & Consistent */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Review Sources
            </h1>
            {sources.length > 0 && (
              <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                {sources.length} Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Manage your review platforms and connections</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['sources'] }); }}
            className={`w-10 h-10 grid place-items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-400 rounded-xl transition-all duration-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-[#4e80ee] hover:shadow-sm active:scale-90 ${isRefreshing ? 'animate-spin border-blue-600 dark:border-blue-500' : ''}`}
            title="Refresh System"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-[13px] font-bold text-gray-600 dark:text-gray-300 transition-all duration-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-blue-400 hover:text-[#4e80ee] active:scale-95 shadow-sm"
          >
            <History size={16} />
            Activity
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-[#4e80ee] hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      </header>

      <main className="w-full px-8 py-6 flex-1 max-w-[1600px] mx-auto space-y-6">
        {/* Stats Section */}
        {stats && <SourceStats stats={stats} isLoading={isLoading} />}

        {/* Filters Toolbar - Modernized */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 group-focus-within:text-[#4e80ee] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Filter by platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700 rounded-xl text-[13px] font-bold text-gray-700 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-gray-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-gray-100 dark:border-slate-700">
              {['All', 'Active', 'Paused', 'Error'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${statusFilter === status
                    ? 'bg-white dark:bg-slate-800 text-[#4e80ee] dark:text-blue-400 shadow-md shadow-gray-200/50 dark:shadow-none translate-y-[-1px]'
                    : 'text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-gray-200'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button className="w-10 h-10 grid place-items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-400 dark:text-slate-400 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:text-[#4e80ee] transition-all shadow-sm active:scale-95">
              <Filter size={18} />
            </button>
          </div>
        </div>

        {/* Sources List */}
        <SourcesTable
          sources={filteredSources}
          isLoading={isLoading}
          onEdit={(source, tab = 'settings') => {
            setSelectedSource(source);
            setActiveModalTab(tab);
            setIsEditModalOpen(true);
          }}
          onDelete={handleDeleteSource}
          onToggleStatus={handleToggleStatus}
          onSync={handleSyncNow}
        />
      </main>

      {/* Panels & Modals */}
      <SyncHistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={logs}
        isLoading={isLoadingLogs}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
      />

      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddSource}
        existingPlatformIds={sources.map(s => s.platformId)}
      />

      {selectedSource && (
        <EditSourceModal
          isOpen={isEditModalOpen}
          initialTab={activeModalTab}
          onClose={() => { setIsEditModalOpen(false); setSelectedSource(null); }}
          source={selectedSource}
          onSave={handleUpdateSource}
          onDelete={handleDeleteSource}
        />
      )}
    </div>
  );
};

export default ReviewSourcesPage;
