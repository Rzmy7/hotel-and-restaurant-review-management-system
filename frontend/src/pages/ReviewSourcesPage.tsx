import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, History, RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { sourcesService } from '../services/sourcesService';
import { Source, SyncLog, SourceStats as SourceStatsType } from '../types/sources';

// New Components
import SourcesTable from '../components/SourcesTable';
import SourceStats from '../components/SourceStats';
import SyncHistoryPanel from '../components/SyncHistoryPanel';
import AddSourceModal from '../components/AddSourceModal';
import EditSourceModal from '../components/EditSourceModal';

const ReviewSourcesPage = () => {
  const { showToast } = useToast();

  // State
  const [sources, setSources] = useState<Source[]>([]);
  const [stats, setStats] = useState<SourceStatsType | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Fetch Data
  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [sourcesData, statsData, logsData] = await Promise.all([
        sourcesService.getSources(),
        sourcesService.getStats(),
        sourcesService.getSyncLogs()
      ]);
      setSources(sourcesData);
      setStats(statsData);
      setLogs(logsData);
    } catch (error) {
      showToast('Failed to fetch sources data', 'error');
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Sources
  const filteredSources = useMemo(() => {
    return sources.filter(source => {
      const matchesSearch = source.platform.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || source.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sources, searchQuery, statusFilter]);

  // Handlers
  const handleAddSource = async (newSourceData: any) => {
    try {
      await sourcesService.addSource(newSourceData);
      await fetchData(true);
      showToast('New source added successfully', 'success');
    } catch (error) {
      showToast('Failed to add source', 'error');
    }
  };

  const handleUpdateSource = async (updatedSource: Source) => {
    try {
      await sourcesService.updateSource(updatedSource.id, updatedSource);
      await fetchData(true);
      showToast('Source updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update source', 'error');
    }
  };

  const handleDeleteSource = async (id: number) => {
    try {
      await sourcesService.deleteSource(id);
      await fetchData(true);
      showToast('Source removed successfully', 'info');
    } catch (error) {
      showToast('Failed to delete source', 'error');
    }
  };

  const handleToggleStatus = async (source: Source) => {
    const newStatus = source.status === 'Active' ? 'Paused' : 'Active';
    try {
      await sourcesService.updateSource(source.id, { status: newStatus });
      await fetchData(true);
      showToast(
        newStatus === 'Active' ? `${source.platform} resumed` : `${source.platform} paused`,
        'success'
      );
    } catch (error) {
      showToast('Failed to toggle status', 'error');
    }
  };

  const handleSyncNow = async (id: number) => {
    const source = sources.find(s => s.id === id);
    if (!source) return;

    showToast(`Starting sync for ${source.platform}...`, 'info');
    try {
      await sourcesService.triggerSync(id);
      // Simulate real-time update
      setTimeout(() => {
        fetchData(true);
        showToast(`Sync completed for ${source.platform}`, 'success');
      }, 2000);
    } catch (error) {
      showToast('Sync failed', 'error');
    }
  };

  return (
    <div className="min-h-full bg-[#FAFAFB] flex flex-col">
      {/* Redesigned Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 px-10 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1600px] mx-auto w-full">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Review Sources
              {sources.length > 0 && (
                <span className="text-sm font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                  {sources.length} Connected
                </span>
              )}
            </h1>
            <p className="mt-1 text-gray-500 font-medium">Configure and manage your review aggregation channels</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setIsRefreshing(true); fetchData(true); }}
              className={`p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all ${isRefreshing ? 'animate-spin text-blue-600' : ''}`}
              title="Refresh Data"
            >
              <RefreshCw size={22} />
            </button>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <History size={18} />
              Sync Logs
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={20} />
              Connect Source
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-10 py-8 flex-1 max-w-[1600px] mx-auto">
        {/* Stats Section */}
        {stats && <SourceStats stats={stats} isLoading={isLoading} />}

        {/* Filters Toolbar */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by platform name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-gray-50 p-1 rounded-xl">
              {['All', 'Active', 'Paused', 'Error'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === status
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button className="p-3 bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl transition-all">
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* Sources List */}
        <SourcesTable
          sources={filteredSources}
          isLoading={isLoading}
          onEdit={(source) => { setSelectedSource(source); setIsEditModalOpen(true); }}
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
        isLoading={isLoading}
      />

      <AddSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddSource}
      />

      {selectedSource && (
        <EditSourceModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setSelectedSource(null); }}
          source={selectedSource as any} // Temporary cast until EditSourceModal is updated
          onSave={handleUpdateSource}
          onDelete={handleDeleteSource}
        />
      )}
    </div>
  );
};

export default ReviewSourcesPage;
