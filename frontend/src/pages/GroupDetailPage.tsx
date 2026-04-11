import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Users, BarChart3, Mail, Trash2, Crown, Shield,
    User as UserIcon, ChevronDown, RefreshCcw, Star, MessageSquare,
    TrendingUp, TrendingDown, Send, X, Check
} from 'lucide-react';
import {
    fetchGroupDetail,
    fetchGroupAnalytics,
    inviteMember,
    removeMember,
    changeMemberRole,
    deleteGroup,
    roleLabel,
    roleColor,
    type GroupDetail,
    type GroupAnalytics,
    type GroupMemberItem,
    type GroupRole,
} from '../services/groupService';

type Tab = 'overview' | 'members' | 'invitations';

// ── Role Icon ───────────────────────────────────────────────────────────────
const RoleIcon = ({ role }: { role: GroupRole }) => {
    if (role === 'GROUP_OWNER')   return <Crown size={13} />;
    if (role === 'GROUP_MANAGER') return <Shield size={13} />;
    return <UserIcon size={13} />;
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">{title}</span>
        </div>
        <p className="text-3xl font-black text-gray-900 dark:text-white">{value}</p>
    </div>
);

// ── Members Tab ─────────────────────────────────────────────────────────────
interface MembersTabProps {
    members: GroupMemberItem[];
    myRole: GroupRole;
    groupId: string;
    onRefresh: () => void;
}

const MembersTab = ({ members, myRole, groupId, onRefresh }: MembersTabProps) => {
    const canManage = myRole === 'GROUP_OWNER' || myRole === 'GROUP_MANAGER';
    const isOwner   = myRole === 'GROUP_OWNER';
    const [actionUserId, setActionUserId] = useState<string | null>(null);

    const handleRemove = async (userId: string) => {
        if (!confirm('Remove this member?')) return;
        setActionUserId(userId);
        try {
            await removeMember(groupId, userId);
            onRefresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to remove member');
        } finally {
            setActionUserId(null);
        }
    };

    const handleRoleChange = async (userId: string, newRole: GroupRole) => {
        setActionUserId(userId);
        try {
            await changeMemberRole(groupId, userId, newRole);
            onRefresh();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to change role');
        } finally {
            setActionUserId(null);
        }
    };

    return (
        <div className="space-y-2">
            {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-sm">
                            {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white text-sm">{m.name}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{m.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleColor(m.role)}`}>
                            <RoleIcon role={m.role} />
                            {roleLabel(m.role)}
                        </span>
                        {canManage && m.role !== 'GROUP_OWNER' && (
                            <>
                                {isOwner && (
                                    <select
                                        value={m.role}
                                        onChange={e => handleRoleChange(m.user_id, e.target.value as GroupRole)}
                                        disabled={actionUserId === m.user_id}
                                        className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="GROUP_MANAGER">Promote to Manager</option>
                                        <option value="GROUP_MEMBER">Set as Member</option>
                                    </select>
                                )}
                                <button
                                    onClick={() => handleRemove(m.user_id)}
                                    disabled={actionUserId === m.user_id}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                    title="Remove member"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Invite Tab ──────────────────────────────────────────────────────────────
interface InviteTabProps {
    groupId: string;
    pendingInvitations: { invitation_id: string; invited_email: string; role: GroupRole; created_at: string | null }[];
    onRefresh: () => void;
}

const InviteTab = ({ groupId, pendingInvitations, onRefresh }: InviteTabProps) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<GroupRole>('GROUP_MEMBER');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setSending(true);
        setError(null);
        setSuccess(null);
        try {
            await inviteMember(groupId, email.trim(), role);
            setSuccess(`Invitation sent to ${email}! They'll see it in their notifications.`);
            setEmail('');
            onRefresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send invitation');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Invite form */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4">Invite a Member</h3>
                <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(null); setSuccess(null); }}
                        placeholder="Enter their email address"
                        className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                    />
                    <select
                        value={role}
                        onChange={e => setRole(e.target.value as GroupRole)}
                        className="px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="GROUP_MEMBER">As Member</option>
                        <option value="GROUP_MANAGER">As Manager</option>
                    </select>
                    <button
                        type="submit"
                        disabled={sending || !email.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#4e80ee] text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        <Send size={15} />
                        {sending ? 'Sending…' : 'Send Invite'}
                    </button>
                </form>
                {error && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 rounded-lg">
                        <X size={15} className="mt-0.5 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mt-3 flex items-start gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-lg">
                        <Check size={15} className="mt-0.5 flex-shrink-0" />
                        {success}
                    </div>
                )}
            </div>

            {/* Pending list */}
            {pendingInvitations.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Pending Invitations</h3>
                    <div className="space-y-2">
                        {pendingInvitations.map(inv => (
                            <div key={inv.invitation_id} className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-slate-700 last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{inv.invited_email}</p>
                                    <p className="text-xs text-gray-400 dark:text-slate-500">Invited as {roleLabel(inv.role)}</p>
                                </div>
                                <span className="text-xs px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full font-medium border border-amber-200 dark:border-amber-800/30">
                                    Pending
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Overview Tab ────────────────────────────────────────────────────────────
const OverviewTab = ({ groupId }: { groupId: string }) => {
    const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchGroupAnalytics(groupId)
            .then(setAnalytics)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [groupId]);

    if (loading) return <div className="text-center py-12 text-gray-400 dark:text-slate-500">Loading analytics…</div>;
    if (error)   return <div className="text-center py-12 text-red-500">{error}</div>;
    if (!analytics) return null;

    const { summary, per_org } = analytics;

    return (
        <div className="space-y-6">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Avg Rating"    value={summary.avg_rating.toFixed(1)} icon={<Star size={18} className="text-amber-500" />}         color="bg-amber-50 dark:bg-amber-900/20" />
                <KpiCard title="Total Reviews" value={summary.review_count.toLocaleString()} icon={<MessageSquare size={18} className="text-blue-500" />} color="bg-blue-50 dark:bg-blue-900/20" />
                <KpiCard title="Positive %"    value={`${summary.positive_pct}%`}    icon={<TrendingUp size={18} className="text-green-500" />}    color="bg-green-50 dark:bg-green-900/20" />
                <KpiCard title="Negative %"    value={`${summary.negative_pct}%`}    icon={<TrendingDown size={18} className="text-red-500" />}    color="bg-red-50 dark:bg-red-900/20" />
            </div>

            {/* Per-organization table */}
            {per_org.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="font-bold text-gray-900 dark:text-white">Organization Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-slate-700">
                                    {['#', 'Organization', 'Avg Rating', 'Reviews', 'Positive %', 'Negative %'].map(h => (
                                        <th key={h} className="px-5 py-3 text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                                {per_org.map((org, idx) => (
                                    <tr key={org.org_id} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-slate-400 font-medium">#{idx + 1}</td>
                                        <td className="px-5 py-4 text-sm font-semibold text-gray-900 dark:text-white">{org.org_name}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <Star size={13} className="text-amber-400 fill-amber-400" />
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">{org.avg_rating.toFixed(1)}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{org.review_count.toLocaleString()}</td>
                                        <td className="px-5 py-4 text-sm text-green-600 dark:text-green-400 font-medium">{org.positive_pct}%</td>
                                        <td className="px-5 py-4 text-sm text-red-500 dark:text-red-400 font-medium">{org.negative_pct}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Detail Page ────────────────────────────────────────────────────────
const GroupDetailPage = () => {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<GroupDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [deleting, setDeleting] = useState(false);

    const loadGroup = useCallback(async () => {
        if (!groupId) return;
        try {
            setLoading(true);
            const data = await fetchGroupDetail(groupId);
            setGroup(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load group');
        } finally {
            setLoading(false);
        }
    }, [groupId]);

    useEffect(() => { loadGroup(); }, [loadGroup]);

    const handleDelete = async () => {
        if (!groupId || !confirm(`Delete "${group?.group_name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteGroup(groupId);
            navigate('/groups');
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete group');
            setDeleting(false);
        }
    };

    if (loading) return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="text-gray-500 dark:text-slate-400">Loading group…</div>
        </div>
    );
    if (error || !group) return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
            <div className="text-red-500">{error || 'Group not found'}</div>
        </div>
    );

    const isOwner   = group.my_role === 'GROUP_OWNER';
    const canManage = isOwner || group.my_role === 'GROUP_MANAGER';

    const TABS = [
        { id: 'overview' as Tab,     label: 'Overview',     icon: <BarChart3 size={15} /> },
        { id: 'members'  as Tab,     label: 'Members',      icon: <Users size={15} />,   count: group.member_count },
        ...(canManage ? [{ id: 'invitations' as Tab, label: 'Invitations', icon: <Mail size={15} />, count: group.pending_invitations.length }] : []),
    ];

    return (
        <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/groups" className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{group.group_name}</h1>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleColor(group.my_role)}`}>
                                <RoleIcon role={group.my_role} />
                                {roleLabel(group.my_role)}
                            </span>
                        </div>
                        {group.description && (
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{group.description}</p>
                        )}
                    </div>
                </div>
                {isOwner && (
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800/40 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors disabled:opacity-40"
                    >
                        <Trash2 size={15} />
                        {deleting ? 'Deleting…' : 'Delete Group'}
                    </button>
                )}
            </header>

            <main className="w-full px-8 py-6 flex-1 max-w-[1400px] mx-auto space-y-6">
                {/* Tabs */}
                <div className="flex gap-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-1 w-fit shadow-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-[#4e80ee] text-white shadow-sm'
                                    : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                {activeTab === 'overview' && <OverviewTab groupId={group.group_id} />}
                {activeTab === 'members' && (
                    <MembersTab members={group.members} myRole={group.my_role} groupId={group.group_id} onRefresh={loadGroup} />
                )}
                {activeTab === 'invitations' && canManage && (
                    <InviteTab groupId={group.group_id} pendingInvitations={group.pending_invitations} onRefresh={loadGroup} />
                )}
            </main>
        </div>
    );
};

export default GroupDetailPage;
