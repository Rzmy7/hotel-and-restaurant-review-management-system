import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ChevronRight, Crown, Shield, User as UserIcon, X } from 'lucide-react';
import {
    fetchGroups,
    createGroup,
    roleLabel,
    roleColor,
    type Group,
    type GroupRole,
} from '../services/groupService';

// ── Create Group Modal ──────────────────────────────────────────────────────
interface CreateModalProps {
    onClose: () => void;
    onCreated: (g: Group) => void;
    isSubgroup?: boolean;
}

const CreateGroupModal = ({ onClose, onCreated, isSubgroup = false }: CreateModalProps) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const group = await createGroup({ group_name: name.trim(), description: desc.trim() || undefined });
            onCreated(group);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                        Create {isSubgroup ? 'Subgroup' : 'Group'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Group Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Hotel Chain Group"
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            placeholder="What is this group for?"
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                        />
                    </div>
                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                    )}
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-[#4e80ee] text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating…' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Role Icon ───────────────────────────────────────────────────────────────
const RoleIcon = ({ role }: { role: GroupRole }) => {
    if (role === 'GROUP_OWNER')   return <Crown size={13} />;
    if (role === 'GROUP_MANAGER') return <Shield size={13} />;
    return <UserIcon size={13} />;
};

// ── Group Card ──────────────────────────────────────────────────────────────
const GroupCard = ({ group, onClick }: { group: Group; onClick: () => void }) => (
    <div
        onClick={onClick}
        className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
                {group.group_name.charAt(0).toUpperCase()}
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleColor(group.my_role)}`}>
                <RoleIcon role={group.my_role} />
                {roleLabel(group.my_role)}
            </span>
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white text-[15px] mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {group.group_name}
        </h3>
        {group.description && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 line-clamp-2">{group.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                <Users size={13} />
                <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
        </div>
    </div>
);

// ── Main Page ───────────────────────────────────────────────────────────────
const GroupsPage = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);

    const loadGroups = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await fetchGroups();
            setGroups(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load groups');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadGroups(); }, [loadGroups]);

    const handleCreated = (g: Group) => {
        setShowCreate(false);
        setGroups(prev => [g, ...prev]);
    };

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Groups & Branches</h1>
                    <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">Collaborate across organizations</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#4e80ee] text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    New Group
                </button>
            </header>

            <main className="w-full px-8 py-8 flex-1 max-w-[1400px] mx-auto">
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {[1,2,3].map(i => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 h-44 animate-pulse" />
                        ))}
                    </div>
                )}
                {error && (
                    <div className="text-center py-16 text-red-500">{error}</div>
                )}
                {!loading && !error && groups.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-5">
                            <Users size={36} className="text-blue-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No groups yet</h2>
                        <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-sm text-sm">Create a group to collaborate with other organizations and compare performance together.</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#4e80ee] text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors"
                        >
                            <Plus size={16} />
                            Create your first group
                        </button>
                    </div>
                )}
                {!loading && !error && groups.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {groups.map(g => (
                            <GroupCard key={g.group_id} group={g} onClick={() => navigate(`/groups/${g.group_id}`)} />
                        ))}
                    </div>
                )}
            </main>

            {showCreate && (
                <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
            )}
        </div>
    );
};

export default GroupsPage;
