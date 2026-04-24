import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Plus, Crown, Shield, Clock, ChevronRight,
  Check, X, Bell, Lock, Globe, Loader2
} from 'lucide-react';
import { groupsService, type Group, type GroupInvite } from '../services/groupsService';
import { useToast } from '../contexts/ToastContext';

// ── Create Group Modal ────────────────────────────────────────────────

interface CreateGroupModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ onClose, onCreated }) => {
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
      await groupsService.createGroup({
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
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Group</h2>
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
              maxLength={1000}
            />
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setIsPrivate(p => !p)}
              className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${isPrivate ? 'bg-brand' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${isPrivate ? 'translate-x-5' : 'translate-x-1'}`} />
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
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
      className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5 cursor-pointer hover:border-brand/40 hover:shadow-md transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-md shadow-brand/20">
          {getInitials(group.group_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
              {group.group_name}
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide ${
              isOwner
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            }`}>
              {isOwner ? <Crown size={9} /> : <Shield size={9} />}
              {isOwner ? 'Owner' : 'Member'}
            </span>
            {group.is_private
              ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"><Lock size={9} /> Private</span>
              : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"><Globe size={9} /> Public</span>
            }
          </div>
          {group.description && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <Users size={12} />
              {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <Clock size={12} />
              {new Date(group.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        <ChevronRight size={18} className="text-gray-300 dark:text-slate-600 group-hover:text-brand transition-colors shrink-0 mt-1" />
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

const InviteCard: React.FC<InviteCardProps> = ({ invite, onAccept, onReject, loading }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-brand/30 dark:border-blue-700/40 p-5">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center shrink-0">
        <Bell size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 dark:text-white text-sm">
          {invite.group_name || 'Group Invitation'}
        </p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
          Invited by <span className="font-semibold text-gray-700 dark:text-slate-300">{invite.invited_by_name || 'Unknown'}</span>
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
          className="w-9 h-9 rounded-xl border border-gray-200 dark:border-slate-600 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-colors disabled:opacity-50"
          title="Decline"
        >
          <X size={16} />
        </button>
        <button
          onClick={() => onAccept(invite.invite_id)}
          disabled={loading}
          className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center hover:bg-brand/90 transition-colors disabled:opacity-50"
          title="Accept"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────

const GroupsPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [inviteActionLoading, setInviteActionLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await groupsService.listGroups();
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

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [fetchGroups, fetchInvites]);

  const handleAccept = async (inviteId: string) => {
    setInviteActionLoading(true);
    try {
      const res = await groupsService.acceptInvite(inviteId);
      showToast(res.message, 'success');
      await Promise.all([fetchGroups(), fetchInvites()]);
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

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Groups</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            Collaborate with your team across organizations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors shadow-md shadow-brand/20"
        >
          <Plus size={16} />
          New Group
        </button>
      </div>

      {/* Pending Invites */}
      {(invites.length > 0 || loadingInvites) && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-brand" />
            <h2 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Pending Invitations
            </h2>
            {invites.length > 0 && (
              <span className="px-2 py-0.5 bg-brand text-white text-xs font-bold rounded-full">
                {invites.length}
              </span>
            )}
          </div>
          {loadingInvites ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={20} className="animate-spin text-brand" />
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
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-500" />
            <h2 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              My Groups
            </h2>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
              ({myGroups.length})
            </span>
          </div>
        </div>

        {loadingGroups ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-brand" />
          </div>
        ) : myGroups.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 p-8 text-center">
            <div className="w-12 h-12 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Users size={20} className="text-brand" />
            </div>
            <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm">No groups yet</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
              Create a group to start collaborating with others
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors"
            >
              Create your first group
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-blue-500" />
            <h2 className="text-sm font-black text-gray-700 dark:text-slate-300 uppercase tracking-wider">
              Member Of
            </h2>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
              ({memberGroups.length})
            </span>
          </div>
          {memberGroups.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 px-1">
              You haven't been added to any groups as a member yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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

      {/* Create modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchGroups}
        />
      )}
    </div>
  );
};

export default GroupsPage;
