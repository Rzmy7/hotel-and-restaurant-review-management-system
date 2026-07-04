import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Crown, Shield, Clock, ChevronRight, Search,
  Check, X, Bell, Lock, Globe, Loader2, Building2
} from 'lucide-react';
import { groupsService, type Group, type GroupInvite } from '../services/groupsService';
import { useToast } from '../contexts/ToastContext';
import { useOrganizationStore } from '../stores/useOrganizationStore';
import SearchPublicGroupsModal from '../components/groups/SearchPublicGroupsModal';
import GroupsSkeleton from './GroupsSkeleton';

// ── Create Group Modal ────────────────────────────────────────────────

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreated, organizationId }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await groupsService.createGroup(organizationId, {
        group_name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
      });
      showToast('Group created successfully!', 'success');
      onCreated();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Create New Group</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Regional Hotels Team"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition-colors"
              maxLength={255}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this group for?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 dark:focus:border-blue-500 transition-colors resize-none"
              maxLength={1000}
            />
          </div>
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
            <button
              type="button"
              onClick={() => setIsPrivate(p => !p)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${isPrivate ? 'bg-[#3b82f6]' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isPrivate ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-slate-300">
                {isPrivate ? <Lock size={13} /> : <Globe size={13} />}
                {isPrivate ? 'Private Group' : 'Public Group'}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {isPrivate ? 'Only invited members can join' : 'Visible to all users'}
              </p>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-100 dark:shadow-none"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Group Card ────────────────────────────────────────────────────────

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ group, onClick }) => {
  const isOwner = group.my_role === 'GROUP_OWNER';

  const getInitials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      onClick={onClick}
      className="group bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#3b82f6] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm shadow-blue-100 dark:shadow-none">
          {getInitials(group.group_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-[15px] truncate">
              {group.group_name}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
              isOwner
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {isOwner ? <Crown size={9} /> : <Shield size={9} />}
              {isOwner ? 'Owner' : 'Member'}
            </span>
            {group.is_private
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"><Lock size={9} /> Private</span>
              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"><Globe size={9} /> Public</span>
            }
          </div>
          {group.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2.5">
            <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
              <Users size={12} />
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500">
              <Clock size={12} />
              {new Date(group.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
      </div>
    </div>
  );
};

// ── Invite Card ───────────────────────────────────────────────────────

interface InviteCardProps {
  invite: GroupInvite;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}

const InviteCard: React.FC<InviteCardProps> = ({ invite, onAccept, onReject, loading }) => {
  const groupLabel = invite.group_name || 'Group Invitation';
  const fromLabel = invite.invited_by_org_name || invite.invited_by_name || 'Unknown';
  // invited_org_name = which of the user's orgs this invite targets
  const toOrgLabel = invite.invited_org_name;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-700/40 shadow-sm p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
          <Building2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white text-sm">{groupLabel}</p>
          {toOrgLabel && (
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
              → {toOrgLabel}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            From <span className="font-semibold text-gray-700 dark:text-slate-300">{fromLabel}</span>
          </p>
          {invite.message && (
            <p className="text-sm text-gray-600 dark:text-slate-300 mt-1 italic">"{invite.message}"</p>
          )}
          {invite.expires_at && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Expires {new Date(invite.expires_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onReject(invite.invite_id)}
            disabled={loading}
            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50"
            title="Decline"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => onAccept(invite.invite_id)}
            disabled={loading}
            className="w-9 h-9 rounded-lg bg-[#3b82f6] text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-sm shadow-blue-100 dark:shadow-none"
            title="Accept"
          >
            <Check size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const currentOrg = useOrganizationStore(state => state.currentOrg);

  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const fetchGroups = useCallback(async (orgId: string) => {
    setLoadingGroups(true);
    try {
      const res = await groupsService.listGroups(orgId);
      setGroups(res.groups);
    } catch (err: any) {
      showToast(err.message || 'Failed to load groups', 'error');
    } finally {
      setLoadingGroups(false);
    }
  }, [showToast]);

  const fetchInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const res = await groupsService.getMyInvites();
      setInvites(res.invites);
    } catch {
      // silently fail — invites are secondary
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  // Re-fetch whenever the active organization changes
  useEffect(() => {
    if (!currentOrg?.id) return;
    fetchGroups(currentOrg.id);
    fetchInvites();
  }, [currentOrg?.id, fetchGroups, fetchInvites]);

  const handleAccept = async (inviteId: string) => {
    setInviteActionLoading(true);
    try {
      const res = await groupsService.acceptInvite(inviteId);
      showToast(res.message, 'success');
      // Optimistically remove the accepted invite from the list
      setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
      // Small delay to allow DB commit to settle before re-fetching group list
      if (currentOrg?.id) {
        await new Promise(resolve => setTimeout(resolve, 600));
        await Promise.all([fetchGroups(currentOrg.id), fetchInvites()]);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to accept invite', 'error');
    } finally {
      setInviteActionLoading(false);
    }
  };

  const handleReject = async (inviteId: string) => {
    setInviteActionLoading(true);
    try {
      await groupsService.rejectInvite(inviteId);
      showToast('Invite declined.', 'info');
      setInvites(prev => prev.filter(i => i.invite_id !== inviteId));
    } catch (err: any) {
      showToast(err.message || 'Failed to reject invite', 'error');
    } finally {
      setInviteActionLoading(false);
    }
  };

  const myGroups = groups.filter(g => g.my_role === 'GROUP_OWNER');
  const memberGroups = groups.filter(g => g.my_role === 'GROUP_MEMBER');

  if (loadingGroups && groups.length === 0) {
    return <GroupsSkeleton />;
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">

      {/* Sticky Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 z-[40] px-8 py-5 flex items-center justify-between transition-all duration-300">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight uppercase">
              Groups
            </h1>
            {!loadingGroups && groups.length > 0 && (
              <span className="text-[10px] font-black bg-[#4e80ee] text-white px-2 py-0.5 rounded-lg shadow-sm shadow-blue-100 uppercase tracking-widest">
                {groups.length}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400 dark:text-slate-400 font-bold uppercase tracking-wider">
            Manage your organization’s group memberships
          </p>
        </div>
        <div className="flex items-center gap-3">
          {invites.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 text-blue-600 dark:text-blue-400 text-sm font-semibold">
              <Bell size={14} />
              {invites.length} pending
            </span>
          )}
          <button
            onClick={() => setShowSearchModal(true)}
            disabled={!currentOrg?.id}
            className="flex items-center gap-2 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-sm transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={16} />
            Search
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!currentOrg?.id}
            className="flex items-center gap-2 bg-[#4e80ee] hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 dark:shadow-none transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            New Group
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-8 py-8 flex-1 max-w-[1600px] mx-auto space-y-8">

        {/* Pending Invitations */}
        {(invites.length > 0 || loadingInvites) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-blue-500" />
              <h2 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                Pending Invitations
              </h2>
              {invites.length > 0 && (
                <span className="px-2 py-0.5 bg-[#3b82f6] text-white text-[10px] font-black rounded-md uppercase tracking-widest">
                  {invites.length}
                </span>
              )}
            </div>
            {loadingInvites ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map(invite => (
                  <InviteCard
                    key={invite.invite_id}
                    invite={invite}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    loading={inviteActionLoading}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Groups I Own */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-amber-500" />
              <h2 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                My Groups
              </h2>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                {myGroups.length}
              </span>
            </div>
          </div>

          {loadingGroups ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-center py-14">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="ml-3 text-sm text-gray-500 dark:text-slate-400">Loading groups…</span>
            </div>
          ) : myGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-dashed border-gray-200 dark:border-slate-700 shadow-sm p-12 text-center">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users size={22} className="text-blue-500" />
              </div>
              <p className="font-bold text-gray-700 dark:text-slate-300 text-[15px]">No groups yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                Create a group to start collaborating with others
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-5 flex items-center gap-2 bg-[#3b82f6] hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors mx-auto shadow-sm shadow-blue-100"
              >
                <Plus size={15} />
                Create your first group
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {myGroups.map(g => (
                <GroupCard
                  key={g.group_id}
                  group={g}
                  onClick={() => navigate(`/groups/${g.group_id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Groups I'm a Member Of */}
        {(memberGroups.length > 0 || (!loadingGroups && memberGroups.length === 0 && groups.length > 0)) && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={14} className="text-blue-500" />
              <h2 className="text-[11px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                Member Of
              </h2>
              <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                {memberGroups.length}
              </span>
            </div>
            {memberGroups.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm p-6">
                <p className="text-sm text-gray-400 dark:text-slate-500">
                  You haven't been added to any groups as a member yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {memberGroups.map(g => (
                  <GroupCard
                    key={g.group_id}
                    group={g}
                    onClick={() => navigate(`/groups/${g.group_id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* Create modal */}
      {showCreateModal && currentOrg?.id && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchGroups(currentOrg.id!)}
          organizationId={currentOrg.id}
        />
      )}

      {showSearchModal && (
        <SearchPublicGroupsModal
          onClose={() => setShowSearchModal(false)}
          onJoinSuccess={() => {
            if (currentOrg?.id) {
              // Re-fetch groups AND invites — delay is already done inside the modal
              fetchGroups(currentOrg.id);
              fetchInvites();
            }
          }}
        />
      )}
    </div>
  );
};

export default GroupsPage;
