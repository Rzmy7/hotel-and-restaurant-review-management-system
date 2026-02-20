import { useState, useMemo } from 'react';
import { Plus, Search, ChevronDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import SourcesTable from '../components/SourcesTable';
import AddSourceModal from '../components/AddSourceModal';
import EditSourceModal from '../components/EditSourceModal';
import type { Source } from '../components/SourcesTable';

interface ReviewSourcesPageProps {
  toggleSidebar?: () => void; // deprecated, no longer used
}



const ReviewSourcesPage: React.FC<ReviewSourcesPageProps> = () => {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [sources, setSources] = useState<Source[]>([
    { id: 1, platform: 'TripAdvisor', status: 'Active', lastSynced: '2 minutes ago', schedule: 'Hourly' },
    { id: 2, platform: 'Booking.com', status: 'Active', lastSynced: '15 minutes ago', schedule: 'Daily' },
    { id: 3, platform: 'Google Reviews', status: 'Paused', lastSynced: '2 hours ago', schedule: 'Hourly' },
    { id: 4, platform: 'Airbnb', status: 'Error', lastSynced: '5 minutes ago', schedule: 'Daily' },
    { id: 5, platform: 'TripAdvisor', status: 'Active', lastSynced: '1 hour ago', schedule: 'Daily' },
    { id: 6, platform: 'Booking.com', status: 'Active', lastSynced: '30 minutes ago', schedule: 'Hourly' },
    { id: 7, platform: 'Google Reviews', status: 'Active', lastSynced: '10 minutes ago', schedule: 'Hourly' },
  ]);

  const filteredSources = useMemo(() => {
    return sources.filter((s) => {
      const matchesSearch = s.platform.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === '' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sources, searchQuery, statusFilter]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditSource = (source: any) => {
    setSelectedSource(source);
    setIsEditModalOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAddSource = (newSource: any) => {
    setSources([...sources, newSource]);
    showToast('New review source added successfully', 'success');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveSource = (updatedSource: any) => {
    setSources(sources.map(s => s.id === updatedSource.id ? updatedSource : s));
    showToast('Source updated successfully', 'success');
  };

  const handleDeleteSource = (sourceOrId: Source | number) => {
    // Check if passed argument is ID or object
    const id = typeof sourceOrId === 'object' ? sourceOrId.id : sourceOrId;
    if (confirm('Are you sure you want to delete this source?')) {
      setSources(sources.filter(s => s.id !== id));
      showToast('Source deleted successfully', 'success');
    }
  };

  const handleTogglePause = (source: Source) => {
    const newStatus = source.status === 'Active' ? 'Paused' : 'Active';
    setSources(sources.map(s =>
      s.id === source.id ? { ...s, status: newStatus } : s
    ));
    showToast(
      newStatus === 'Paused'
        ? `${source.platform} paused — reviews will not sync`
        : `${source.platform} resumed — reviews will sync on schedule`,
      newStatus === 'Paused' ? 'info' : 'success'
    );
  };

  return (
    <div className="min-h-full bg-gray-50 flex flex-col">
      {/* ── Sticky Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-8 py-5">
        <div className="flex justify-between items-center">
          {/* Left: title */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold text-gray-900 m-0 leading-tight">Review Sources</h1>
              <p className="mt-1 text-[13px] text-gray-400 hidden sm:block m-0 leading-none">Manage your connected review platforms</p>
            </div>
          </div>

          {/* Right: Add Source */}
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all flex items-center gap-2"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} />
            Add Source
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="w-full px-8 py-8 flex-1">
        {/* Toolbar: search + filter */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 transition-shadow text-sm outline-none"
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="relative w-full sm:w-48">
            <select
              className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Error">Error</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Sources Table */}
        <SourcesTable
          sources={filteredSources}
          onEditSource={handleEditSource}
          onDeleteSource={handleDeleteSource}
          onTogglePause={handleTogglePause}
        />
      </main>

      {/* Add Source Modal */}
      <AddSourceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddSource}
      />

      {/* Edit Source Modal */}
      <EditSourceModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setSelectedSource(null); }}
        source={selectedSource}
        onSave={handleSaveSource}
        onDelete={handleDeleteSource}
      />
    </div>
  );
};

export default ReviewSourcesPage;
