import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, Users, Hotel, Crown, Shield, Eye,
  Trash2, MoreVertical,
} from 'lucide-react';
import CreateGroupModal from '../components/groups/CreateGroupModal';

type UserRole = 'owner' | 'manager' | 'member';

interface Group {
  id: number;
  name: string;
  description: string;
  hotelCount: number;
  memberCount: number;
  currentUserRole: UserRole;
  createdAt: string;
}

const MOCK_GROUPS: Group[] = [
  {
    id: 1,
    name: 'Luxury Hotels Sri Lanka',
    description: 'Premium luxury hotel properties across Sri Lanka',
    hotelCount: 4,
    memberCount: 8,
    currentUserRole: 'owner',
    createdAt: '2025-12-15',
  },
  {
    id: 2,
    name: 'Beach Resorts Collection',
    description: 'Coastal and beach resort properties',
    hotelCount: 3,
    memberCount: 5,
    currentUserRole: 'manager',
    createdAt: '2026-01-20',
  },
  {
    id: 3,
    name: 'City Hotels Network',
    description: 'Urban hotel properties in major cities',
    hotelCount: 6,
    memberCount: 12,
    currentUserRole: 'member',
    createdAt: '2026-02-10',
  },
  {
    id: 4,
    name: 'Mountain Retreats',
    description: 'Hill country and mountain resort properties',
    hotelCount: 2,
    memberCount: 4,
    currentUserRole: 'owner',
    createdAt: '2026-03-01',
  },
];

const roleBadge: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  owner: { label: 'Owner', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Crown size={12} /> },
  manager: { label: 'Manager', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Shield size={12} /> },
  member: { label: 'Member', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <Eye size={12} /> },
};

const CURRENT_USER_IS_OWNER = true;

const GroupsBranchesPage = () => {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const handleCreateGroup = (name: string, description: string) => {
    const newGroup: Group = {
      id: Date.now(),
      name,
      description,
      hotelCount: 0,
      memberCount: 1,
      currentUserRole: 'owner',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setGroups(prev => [newGroup, ...prev]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteGroup = (groupId: number) => {
    const group = groups.find(g => g.id === groupId);
    if (group?.currentUserRole !== 'owner') return;
    if (!confirm(`Delete "${group.name}"? This action cannot be undone.`)) return;
    setGroups(prev => prev.filter(g => g.id !== groupId));
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Groups & Branches</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your hotel groups — add hotels, invite members, assign roles
          </p>
        </div>
        {CURRENT_USER_IS_OWNER && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Create Group
          </button>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{groups.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Groups</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Hotel size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {groups.reduce((sum, g) => sum + g.hotelCount, 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Hotels</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {groups.reduce((sum, g) => sum + g.memberCount, 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Members</p>
              </div>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300">No groups yet</h3>
            <p className="text-sm text-gray-400 mt-1">Create your first group to start managing hotel branches</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((group) => {
              const badge = roleBadge[group.currentUserRole];
              return (
                <div
                  key={group.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300 overflow-hidden group"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" />

                  <div className="p-5">
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 size={22} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-[15px] truncate">
                            {group.name}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border mt-1 ${badge.color}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {group.currentUserRole === 'owner' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(menuOpenId === group.id ? null : group.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {menuOpenId === group.id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 py-1 w-40 z-10">
                              <button
                                onClick={() => {
                                  handleDeleteGroup(group.id);
                                  setMenuOpenId(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={14} />
                                Delete Group
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {group.description}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        <Hotel size={15} className="text-gray-400" />
                        <span className="font-semibold">{group.hotelCount}</span>
                        <span className="text-gray-400">hotels</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                        <Users size={15} className="text-gray-400" />
                        <span className="font-semibold">{group.memberCount}</span>
                        <span className="text-gray-400">members</span>
                      </div>
                    </div>

                    {/* Action */}
                    <button
                      onClick={() => navigate(`/groups/${group.id}`)}
                      className="w-full py-2.5 bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-semibold hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-all"
                    >
                      {group.currentUserRole === 'member' ? 'View Group' : 'Manage Group'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
};

export default GroupsBranchesPage;
