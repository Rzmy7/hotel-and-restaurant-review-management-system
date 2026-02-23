import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, History, RefreshCw } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { sourcesService } from '../services/sourcesService';
import type { Source, SyncLog, SourceStats as SourceStatsType } from '../types/sources';

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
  const [activeModalTab, setActiveModalTab] = useState<'settings' | 'analytics'>('settings');
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
  const handleAddSource = async (newSourceData: Partial<Source>) => {
    try {
      await sourcesService.addSource(newSourceData as any);
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
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* Redesigned Header - Sophisticated & Consistent */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
              Review Sources
            </h1>
            {sources.length > 0 && (
              <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                {sources.length} Connected
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 font-bold uppercase tracking-wider">Manage your review platforms and connections</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => { setIsRefreshing(true); fetchData(true); }}
            className={`w-10 h-10 grid place-items-center bg-gray-50 border border-gray-200 text-gray-400 rounded-xl transition-all duration-300 hover:border-blue-400 hover:text-[#4e80ee] hover:shadow-sm active:scale-90 ${isRefreshing ? 'animate-spin border-blue-600' : ''}`}
            title="Refresh System"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-600 transition-all duration-300 hover:bg-gray-50 hover:border-blue-400 hover:text-[#4e80ee] active:scale-95 shadow-sm"
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
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#4e80ee] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Filter by platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-[13px] font-bold text-gray-700 placeholder:text-gray-400 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-[#4e80ee] transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-100">
              {['All', 'Active', 'Paused', 'Error'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${statusFilter === status
                    ? 'bg-white text-[#4e80ee] shadow-md shadow-gray-200/50 translate-y-[-1px]'
                    : 'text-gray-400 hover:text-gray-600'
                    }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button className="w-10 h-10 grid place-items-center bg-white border border-gray-200 text-gray-400 rounded-xl hover:border-blue-400 hover:text-[#4e80ee] transition-all shadow-sm active:scale-95">
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
