import React, { useState, useEffect } from 'react';
import { X, Search, Loader2, Globe, Users, Plus } from 'lucide-react';
import { groupsService, Group } from '../../services/groupsService';
import { useToast } from '../../contexts/ToastContext';

interface SearchPublicGroupsModalProps {
  onClose: () => void;
  onJoinSuccess: (groupId: string) => void;
}

const SearchPublicGroupsModal: React.FC<SearchPublicGroupsModalProps> = ({ onClose, onJoinSuccess }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim().length === 0) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await groupsService.searchPublicGroups(query);
        setResults(res.groups);
      } catch (err: any) {
        showToast(err.message || 'Search failed', 'error');
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, showToast]);

  const handleJoin = async (groupId: string) => {
    setJoiningId(groupId);
    try {
      const res = await groupsService.joinPublicGroup(groupId);
      showToast(res.message, 'success');
      onJoinSuccess(groupId);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to join group', 'error');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 dark:bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
              <Search size={16} className="text-blue-500" />
              Join a Group
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 font-medium">Search and join public groups</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-800">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by group name or description..."
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1">
              {results.map((group) => (
                <div key={group.group_id} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors flex items-center gap-3 border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Globe size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{group.group_name}</h4>
                    {group.description && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-0.5">{group.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                        <Users size={10} />
                        {group.member_count} Members
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoin(group.group_id)}
                    disabled={joiningId === group.group_id}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-gray-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors disabled:opacity-50"
                  >
                    {joiningId === group.group_id ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Join
                  </button>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="text-center py-8">
              <Globe size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No public groups found.</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Search size={32} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Search to discover public groups.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchPublicGroupsModal;
