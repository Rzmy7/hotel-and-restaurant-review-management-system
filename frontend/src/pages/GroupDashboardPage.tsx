import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Crown, Shield, Trash2, UserMinus,
  Link2, Copy, RefreshCw, Settings, BarChart3, Bell,
  Search, Send, X, Check, Building2, Star, TrendingUp,
  ChevronDown, Lock, Globe, Loader2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  groupsService,
  type Group,
  type GroupMember,
  type GroupInvite,
  type GroupAnalytics,
  type GroupSettings,
  type Organization,
} from '../services/groupsService';
import { useToast } from '../contexts/ToastContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';

const SENTIMENT_COLORS = { positive: '#22c55e', negative: '#ef4444', neutral: '#94a3b8' };
const BRAND_COLOR = '#3b82f6';

// ── Tabs ──────────────────────────────────────────────────────────────

type Tab = 'overview' | 'members' | 'invites' | 'analytics' | 'settings';

const TABS: { id: Tab; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={15} /> },
  { id: 'members', label: 'Members', icon: <Users size={15} /> },
  { id: 'invites', label: 'Invites', icon: <Bell size={15} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={15} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={15} />, ownerOnly: true },
];

// ── Stat Card ─────────────────────────────────────────────────────────

const StatCard: React.FC<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  iconBg?: string;
  iconFg?: string;
}> = ({ label, value, icon, sub, iconBg = 'bg-blue-50 dark:bg-blue-900/30', iconFg = 'text-blue-500 dark:text-blue-400' }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200">
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{label}</p>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} ${iconFg}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{sub}</p>}
  </div>
);

// ── Invite Modal ──────────────────────────────────────────────────────

interface InviteModalProps {
  groupId: string;
  onClose: () => void;
  onInvited: () => void;
}

const InviteModal: React.FC<InviteModalProps> = ({ groupId, onClose, onInvited }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Organization[]>([]);
  const [selected, setSelected] = useState<Organization | null>(null);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await groupsService.searchOrganizations(q);
      setResults(res.organizations);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setSelected(null);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 350);
  };

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      await groupsService.sendInvite(groupId, {
        organization_id: selected.organization_id,
        message: message.trim() || undefined,
      });
      showToast(`Invite sent to ${selected.owner_name}!`, 'success');
      onInvited();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to send invite', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite via Organization</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            placeholder="Search organizations by name…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        {/* Search Results */}
        {!selected && (query.trim().length > 0) && (
          <div className="border border-gray-200 dark:border-slate-600 rounded-xl overflow-hidden mb-4 max-h-52 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={18} className="animate-spin text-brand" />
              </div>
            ) : results.length === 0 ? (
              <p className="text-center text-sm text-gray-400 dark:text-slate-500 py-5">No organizations found</p>
            ) : (
              results.map(org => (
                <button
                  key={org.organization_id}
                  onClick={() => { setSelected(org); setQuery(org.organization_name); setResults([]); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-b-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0 text-xs font-bold">
                    {org.organization_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.organization_name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500 truncate">Owner: {org.owner_name} · {org.owner_email}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected org preview */}
        {selected && (
          <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-brand/5 border border-brand/20 dark:bg-blue-900/20 dark:border-blue-700/40">
            <Building2 size={18} className="text-brand shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{selected.organization_name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">{selected.owner_name} · {selected.owner_email}</p>
            </div>
            <button onClick={() => { setSelected(null); setQuery(''); }} className="text-gray-400 hover:text-red-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
            Personal message <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a personal note to the invitation…"
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selected || sending}
            className="flex-1 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirm Modal ──────────────────────────────────────────────

const DeleteGroupModal: React.FC<{ groupName: string; onConfirm: () => void; onClose: () => void; loading: boolean }> = ({
  groupName, onConfirm, onClose, loading
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-sm p-6 text-center">
      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Trash2 size={22} className="text-red-500" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Group?</h2>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
        Are you sure you want to delete <strong>"{groupName}"</strong>? This action cannot be undone.
        All members and invites will be removed.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Overview Tab ──────────────────────────────────────────────────────

const OverviewTab: React.FC<{ group: Group; analytics: GroupAnalytics | null; loadingAnalytics: boolean }> = ({
  group, analytics, loadingAnalytics
}) => {
  const isOwner = group.my_role === 'GROUP_OWNER';
  const canSeeAnalytics = isOwner || group.settings.show_analytics_to_members;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Organizations" value={group.member_count} icon={<Building2 size={16} />} />
        <StatCard label="Your Role" value={isOwner ? 'Owner' : 'Member'}
          icon={isOwner ? <Crown size={16} /> : <Shield size={16} />}
          iconBg={isOwner ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/30'}
          iconFg={isOwner ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400'}
        />
        {canSeeAnalytics && analytics ? (
          <>
            <StatCard label="Total Reviews" value={analytics.total_reviews.toLocaleString()} icon={<Star size={16} />} />
            <StatCard label="Avg Rating" value={analytics.avg_rating ? `${analytics.avg_rating} ★` : '—'} icon={<TrendingUp size={16} />} />
          </>
        ) : (
          <>
            <StatCard label="Total Reviews" value="—" icon={<Star size={16} />} sub={canSeeAnalytics ? 'Loading…' : 'Restricted'} />
            <StatCard label="Avg Rating" value="—" icon={<TrendingUp size={16} />} sub={canSeeAnalytics ? 'Loading…' : 'Restricted'} />
          </>
        )}
      </div>

      {/* Group info card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-3">Group Info</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {group.is_private ? <Lock size={13} className="text-gray-400" /> : <Globe size={13} className="text-gray-400" />}
            <span className="text-gray-500 dark:text-slate-400">{group.is_private ? 'Private group' : 'Public group'}</span>
          </div>
          {group.description && (
            <p className="text-sm text-gray-600 dark:text-slate-300">{group.description}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Created {new Date(group.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Recently joined orgs */}
      {analytics && analytics.member_orgs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4">Member Organizations</h3>
          <div className="space-y-3">
            {analytics.member_orgs.map(org => (
              <div key={org.organization_id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  {org.organization_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.organization_name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Owner: {org.owner_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-slate-300">{org.review_count} reviews</p>
                  {org.avg_rating && <p className="text-xs text-gray-400">{org.avg_rating}★</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading analytics */}
      {loadingAnalytics && (
        <div className="flex items-center justify-center py-6">
          <Loader2 size={20} className="animate-spin text-blue-500" />
          <span className="text-sm text-gray-400 dark:text-slate-500 ml-2">Loading analytics…</span>
        </div>
      )}
    </div>
  );
};

// ── Members Tab (Member Organizations) ───────────────────────────────

const MembersTab: React.FC<{
  groupId: string;
  isOwner: boolean;
  onMemberRemoved: () => void;
}> = ({ groupId, isOwner, onMemberRemoved }) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await groupsService.listMembers(groupId);
      setMembers(res.members);
    } catch (err: any) {
      showToast(err.message || 'Failed to load member organizations', 'error');
    } finally {
      setLoading(false);
    }
  }, [groupId, showToast]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleRemove = async (organizationId: string, orgName: string) => {
    if (!confirm(`Remove "${orgName}" from the group?`)) return;
    setRemovingId(organizationId);
    try {
      await groupsService.removeMember(groupId, organizationId);
      showToast(`"${orgName}" has been removed.`, 'success');
      setMembers(prev => prev.filter(m => m.organization_id !== organizationId));
      onMemberRemoved();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove organization', 'error');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={24} className="animate-spin text-blue-500" />
    </div>
  );

  if (members.length === 0) return (
    <div className="text-center py-16">
      <Building2 size={36} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">No member organizations yet</p>
      <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Invite organizations to join this group</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-blue-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
            {members.length} member organization{members.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-700">
        {members.map(m => {
          // Prefer organization_name if backend sends it, fall back to owner name
          const orgName = m.organization_name || `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email;
          const ownerDisplay = m.email;
          return (
            <div key={m.user_id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                {orgName.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{orgName}</p>
                  {m.role === 'GROUP_OWNER' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 uppercase tracking-wide">
                      Group Owner
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">
                  Owner: {ownerDisplay}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Joined {new Date(m.joined_at).toLocaleDateString()}
                </p>
                {isOwner && m.role !== 'GROUP_OWNER' && (
                  <button
                    onClick={() => handleRemove(m.organization_id!, orgName)}
                    disabled={removingId === m.organization_id}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    title="Remove organization"
                  >
                    {removingId === m.organization_id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Invites Tab ───────────────────────────────────────────────────────

const InvitesTab: React.FC<{
  group: Group;
  isOwner: boolean;
  onInviteChange: () => void;
}> = ({ group, isOwner, onInviteChange }) => {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(group.invite_link_token);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const frontendBase = window.location.origin;
  const inviteUrl = linkToken ? `${frontendBase}/groups/join/${linkToken}` : null;

  const fetchInvites = useCallback(async () => {
    if (!isOwner) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await groupsService.listGroupInvites(group.group_id);
      setInvites(res.invites);
    } catch (err: any) {
      showToast(err.message || 'Failed to load invites', 'error');
    } finally {
      setLoading(false);
    }
  }, [group.group_id, isOwner, showToast]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    try {
      const res = await groupsService.generateInviteLink(group.group_id);
      setLinkToken(res.token);
      showToast('Invite link generated (valid for 7 days)', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate link', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!confirm('Revoke invite link? Anyone who had it will no longer be able to join.')) return;
    setRevokingLink(true);
    try {
      await groupsService.revokeInviteLink(group.group_id);
      setLinkToken(null);
      showToast('Invite link revoked.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke link', 'error');
    } finally {
      setRevokingLink(false);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await groupsService.cancelInvite(group.group_id, inviteId);
      setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
      showToast('Invite cancelled.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel invite', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
      expired: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
    };
    return map[status] || '';
  };

  return (
    <div className="space-y-6">
      {/* Invite link card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} className="text-blue-500" />
          <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Invite Link</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Share this link with anyone you want to invite. Valid for 7 days.
        </p>
        {inviteUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl border border-gray-200 dark:border-slate-600">
              <span className="text-xs text-gray-600 dark:text-slate-300 truncate flex-1 font-mono">{inviteUrl}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand/90 transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {isOwner && (
              <button
                onClick={handleRevokeLink}
                disabled={revokingLink}
                className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                {revokingLink ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                Revoke link
              </button>
            )}
          </div>
        ) : (
          isOwner ? (
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors"
            >
              {generatingLink ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Generate Invite Link
            </button>
          ) : (
            <p className="text-sm text-gray-400 dark:text-slate-500">No active invite link</p>
          )
        )}
      </div>

      {/* Send invite by org */}
      {isOwner && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Invite Organizations</h3>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Search and invite organizations to join this group</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
            >
              <Send size={14} />
              Invite
            </button>
          </div>

          {/* Invites table */}
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={18} className="animate-spin text-blue-500" />
            </div>
          ) : invites.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">No invitations sent yet</p>
          ) : (
            <div className="space-y-2">
              {invites.map(inv => {
                const orgLabel = inv.invited_org_name || inv.invited_user_name || inv.invited_user_email || 'Unknown Organization';
                return (
                  <div key={inv.invite_id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center shrink-0">
                      <Building2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{orgLabel}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        Sent {new Date(inv.created_at).toLocaleDateString()}
                      </p>
                      {inv.message && <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-0.5">"{inv.message}"</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleCancelInvite(inv.invite_id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                        title="Cancel invite"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showInviteModal && (
        <InviteModal
          groupId={group.group_id}
          onClose={() => setShowInviteModal(false)}
          onInvited={() => { fetchInvites(); onInviteChange(); }}
        />
      )}
    </div>
  );
};

// ── Analytics Tab ─────────────────────────────────────────────────────

const AnalyticsTab: React.FC<{ analytics: GroupAnalytics | null; loading: boolean; restricted: boolean }> = ({
  analytics, loading, restricted
}) => {
  if (restricted) return (
    <div className="text-center py-16">
      <AlertCircle size={40} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="font-semibold text-gray-500 dark:text-slate-400">Analytics are restricted</p>
      <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">The group owner has not enabled analytics visibility for members.</p>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={28} className="animate-spin text-brand" />
    </div>
  );

  if (!analytics) return (
    <div className="text-center py-16">
      <p className="text-sm text-gray-400 dark:text-slate-500">No analytics data available.</p>
    </div>
  );

  const sentimentData = [
    { name: 'Positive', value: analytics.positive_count, color: SENTIMENT_COLORS.positive },
    { name: 'Negative', value: analytics.negative_count, color: SENTIMENT_COLORS.negative },
    { name: 'Neutral', value: analytics.neutral_count, color: SENTIMENT_COLORS.neutral },
  ].filter(d => d.value > 0);

  const allStars = [1, 2, 3, 4, 5];
  const ratingMap = Object.fromEntries(analytics.rating_distribution.map(r => [r.star, r.count]));
  const ratingData = allStars.map(s => ({ star: `${s}★`, count: ratingMap[s] || 0 }));

  const acceptanceRate = analytics.invite_stats.total_sent > 0
    ? Math.round((analytics.invite_stats.accepted_count / analytics.invite_stats.total_sent) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Reviews" value={analytics.total_reviews.toLocaleString()} icon={<Star size={16} />} />
        <StatCard label="Avg Rating" value={analytics.avg_rating ? `${analytics.avg_rating} ★` : '—'} icon={<TrendingUp size={16} />} />
        <StatCard label="Positive Reviews" value={analytics.positive_count.toLocaleString()} icon={<Check size={16} />} />
        <StatCard label="Invite Acceptance" value={`${acceptanceRate}%`} icon={<Users size={16} />}
          sub={`${analytics.invite_stats.accepted_count}/${analytics.invite_stats.total_sent} accepted`}
        />
      </div>

      {/* Reviews over time */}
      {analytics.reviews_over_time.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
          <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4">Review Volume (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={analytics.reviews_over_time} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorReviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND_COLOR} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={BRAND_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-gray-400" />
              <YAxis tick={{ fontSize: 11 }} className="text-gray-400" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="count" name="Reviews" stroke={BRAND_COLOR} fill="url(#colorReviews)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sentiment breakdown */}
        {sentimentData.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4">Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {sentimentData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rating distribution */}
        {analytics.rating_distribution.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
            <h3 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider mb-4">Rating Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ratingData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-slate-700" />
                <XAxis dataKey="star" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: '12px' }} />
                <Bar dataKey="count" name="Reviews" fill={BRAND_COLOR} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Member organizations */}
      {analytics.member_orgs.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider">Member Organizations</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {analytics.member_orgs.map(org => (
              <div key={org.organization_id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center text-xs font-bold shrink-0">
                  {org.organization_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{org.organization_name}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{org.owner_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{org.review_count.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">{org.avg_rating ? `${org.avg_rating}★` : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analytics.total_reviews === 0 && (
        <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <BarChart3 size={36} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="font-semibold text-gray-500 dark:text-slate-400 text-sm">No review data yet</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Review analytics will appear as members add organizations with review sources</p>
        </div>
      )}
    </div>
  );
};

// ── Settings Tab ──────────────────────────────────────────────────────

const SettingsTab: React.FC<{
  group: Group;
  onGroupUpdated: (g: Group) => void;
  onGroupDeleted: () => void;
}> = ({ group, onGroupUpdated, onGroupDeleted }) => {
  const [name, setName] = useState(group.group_name);
  const [description, setDescription] = useState(group.description || '');
  const [isPrivate, setIsPrivate] = useState(group.is_private);
  const [settings, setSettings] = useState<GroupSettings>({ ...group.settings });
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      await groupsService.updateGroup(group.group_id, {
        group_name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
      await groupsService.updateSettings(group.group_id, settings);
      showToast('Group settings saved!', 'success');
      onGroupUpdated({ ...group, group_name: name.trim(), description: description.trim() || null, is_private: isPrivate, settings });
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await groupsService.deleteGroup(group.group_id);
      showToast('Group deleted.', 'success');
      onGroupDeleted();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete group', 'error');
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const ToggleRow: React.FC<{
    label: string;
    sub: string;
    icon: React.ReactNode;
    value: boolean;
    onChange: (v: boolean) => void;
  }> = ({ label, sub, icon, value, onChange }) => (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{sub}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${value ? 'bg-brand' : 'bg-gray-300 dark:bg-slate-600'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* General info */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-4">General</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Group Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} maxLength={255}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={1000}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600">
            <button type="button" onClick={() => setIsPrivate(p => !p)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${isPrivate ? 'bg-brand' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isPrivate ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-slate-300">
                {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                {isPrivate ? 'Private Group' : 'Public Group'}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">{isPrivate ? 'Only invited members can join' : 'Visible to all users'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Member permissions */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5">
        <h3 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest mb-1">Member Permissions</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">Control what members can see and do</p>
        <ToggleRow
          label="Allow Members to Invite"
          sub="Members can send invitations to other organizations"
          icon={<Send size={15} />}
          value={settings.can_members_invite}
          onChange={v => setSettings(s => ({ ...s, can_members_invite: v }))}
        />
        <ToggleRow
          label="Show Member List"
          sub="Members can see the full list of group members"
          icon={<Users size={15} />}
          value={settings.show_members_to_members}
          onChange={v => setSettings(s => ({ ...s, show_members_to_members: v }))}
        />
        <ToggleRow
          label="Share Analytics with Members"
          sub="Members can view review analytics and data"
          icon={<Eye size={15} />}
          value={settings.show_analytics_to_members}
          onChange={v => setSettings(s => ({ ...s, show_analytics_to_members: v }))}
        />
      </div>

      <button
        onClick={handleSaveInfo}
        disabled={saving || !name.trim()}
        className="w-full px-4 py-2.5 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white font-bold text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-100 dark:shadow-none"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Save Changes
      </button>

      {/* Danger zone */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-red-200 dark:border-red-900/40 shadow-sm p-5">
        <h3 className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Deleting this group is permanent. All members and invite history will be removed.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={15} />
          Delete Group
        </button>
      </div>

      {showDelete && (
        <DeleteGroupModal
          groupName={group.group_name}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════════

const GroupDashboardPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentOrg = useOrganizationStore(state => state.currentOrg);
  const organizationId = currentOrg?.id;

  const [group, setGroup] = useState<Group | null>(null);
  const [analytics, setAnalytics] = useState<GroupAnalytics | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsRestricted, setAnalyticsRestricted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const fetchGroup = useCallback(async () => {
    if (!groupId || !organizationId) return;
    setLoadingGroup(true);
    try {
      const g = await groupsService.getGroup(groupId, organizationId);
      setGroup(g);
    } catch (err: any) {
      showToast(err.message || 'Failed to load group', 'error');
      navigate('/groups');
    } finally {
      setLoadingGroup(false);
    }
  }, [groupId, organizationId, navigate, showToast]);

  const fetchAnalytics = useCallback(async () => {
    if (!groupId) return;
    setLoadingAnalytics(true);
    setAnalyticsRestricted(false);
    try {
      const a = await groupsService.getAnalytics(groupId);
      setAnalytics(a);
    } catch (err: any) {
      if (err.message?.includes('restricted') || err.message?.includes('not visible')) {
        setAnalyticsRestricted(true);
      }
    } finally {
      setLoadingAnalytics(false);
    }
  }, [groupId]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);
  useEffect(() => {
    if (group) fetchAnalytics();
  }, [group, fetchAnalytics]);

  if (loadingGroup) return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-blue-500" />
    </div>
  );

  if (!group) return null;

  const isOwner = group.my_role === 'GROUP_OWNER';
  const visibleTabs = TABS.filter(t => !t.ownerOnly || isOwner);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">

      {/* Sticky Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate('/groups')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-colors shrink-0"
          >
            <ArrowLeft size={17} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase truncate">
                {group.group_name}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                isOwner ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {isOwner ? <Crown size={10} /> : <Shield size={10} />}
                {isOwner ? 'Owner' : 'Member'}
              </span>
            </div>
            {group.description && (
              <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider truncate">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-500 dark:text-slate-400">
            <Users size={14} />
            {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
          </span>
        </div>
      </header>

      {/* Tabs bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-8">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-[13px] font-bold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-[#3b82f6] text-[#3b82f6] dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto">
        {activeTab === 'overview' && (
          <OverviewTab group={group} analytics={analytics} loadingAnalytics={loadingAnalytics} />
        )}
        {activeTab === 'members' && (
          <MembersTab groupId={group.group_id} isOwner={isOwner} onMemberRemoved={fetchGroup} />
        )}
        {activeTab === 'invites' && (
          <InvitesTab group={group} isOwner={isOwner} onInviteChange={fetchGroup} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsTab analytics={analytics} loading={loadingAnalytics} restricted={analyticsRestricted} />
        )}
        {activeTab === 'settings' && isOwner && (
          <SettingsTab
            group={group}
            onGroupUpdated={(updated) => setGroup(updated)}
            onGroupDeleted={() => navigate('/groups')}
          />
        )}
      </main>
    </div>
  );
};

export default GroupDashboardPage;
