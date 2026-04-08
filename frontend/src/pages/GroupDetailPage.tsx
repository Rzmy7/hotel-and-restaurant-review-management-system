import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Hotel as HotelIcon, Users, Crown, Shield, Eye, Star,
  MapPin, Trash2, UserPlus, ChevronUp, ChevronDown, MoreVertical, X, CheckCircle2, Copy, Check
} from 'lucide-react';

type UserRole = 'owner' | 'member';
type ActiveTab = 'hotels' | 'members';

interface Member {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

interface GroupHotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'pending';
}

interface GroupDetail {
  id: string;
  name: string;
  description: string;
  currentUserRole: UserRole;
  createdAt: string;
  hotels: GroupHotel[];
  members: Member[];
}

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/** Fetch wrapper that automatically attaches the JWT token from localStorage */
const authFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
};


const roleBadge: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  owner: { label: 'Owner', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Crown size={12} /> },
  member: { label: 'Member', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <Eye size={12} /> },
};

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('hotels');
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Invite Hotel form
  const [showInviteHotel, setShowInviteHotel] = useState(false);
  const [inviteHotelName, setInviteHotelName] = useState('');
  const [inviteHotelLocation, setInviteHotelLocation] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API}/groups/${id}`);
      if (res.status === 404) { setError('Group not found'); return; }
      if (res.status === 401) { setError('Please log in to view this group'); return; }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setGroup(data);
    } catch (e: any) {
      setError('Could not load group. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const handleRemoveHotel = async (hotelId: string) => {
    try {
      const res = await authFetch(`${API}/groups/${id}/hotels/${hotelId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setGroup(prev => prev ? { ...prev, hotels: prev.hotels.filter(h => h.id !== hotelId) } : prev);
    } catch (e) {
      console.error('Failed to remove hotel:', e);
      alert('Could not remove hotel.');
    }
  };

  const handleHotelInvite = async () => {
    if (!inviteEmail.trim() || !inviteHotelName.trim() || !group) return;
    try {
      const res = await authFetch(`${API}/groups/${id}/hotel-invites`, {
        method: 'POST',
        body: JSON.stringify({
          hotel_name: inviteHotelName.trim(),
          location: inviteHotelLocation.trim(),
          email: inviteEmail.trim(),
          role: 'member'
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Could not send invite.');
        return;
      }
      const data = await res.json();
      setInviteLink(data.link);
    } catch (e) {
      console.error('Failed to send invite:', e);
      alert('Could not send invite.');
    }
  };


  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'member' | 'manager') => {
    try {
      await authFetch(`${API}/groups/${id}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      setGroup(prev => prev ? {
        ...prev,
        members: prev.members.map(m => m.id === memberId ? { ...m, role: newRole === 'manager' ? 'owner' : 'member' } : m),
      } : prev);
      setMemberMenuId(null);
    } catch (e) {
      console.error('Failed to change role:', e);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const res = await authFetch(`${API}/groups/${id}/members/${memberId}`, { method: 'DELETE' });
      if (!res.ok) { alert('Could not remove member.'); return; }
      setGroup(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : prev);
      setMemberMenuId(null);
    } catch (e) {
      console.error('Failed to remove member:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading group...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{error || 'Group not found'}</h2>
          <button onClick={() => navigate('/groups')} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-semibold">
            &larr; Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const isOwner = group.currentUserRole === 'owner';
  const canManageMembers = isOwner;

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-700/80 sticky top-0 z-[40] px-8 py-5">
        <button
          onClick={() => navigate('/groups')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 font-medium mb-3 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Groups
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleBadge[group.currentUserRole].color}`}>
                {roleBadge[group.currentUserRole].icon}
                {roleBadge[group.currentUserRole].label}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <HotelIcon size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{group.hotels.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hotels</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{group.members.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Shield size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {group.members.filter(m => m.role === 'owner').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Managers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-100 dark:border-slate-700 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'hotels' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <HotelIcon size={16} />
            Hotels ({group.hotels.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'members' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <Users size={16} />
            Members ({group.members.length})
          </button>
        </div>

        {/* Hotels Tab */}
        {activeTab === 'hotels' && (
          <div>
            {isOwner && (
              <button
                onClick={() => setShowInviteHotel(true)}
                className="flex items-center gap-2 mb-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Invite Hotel
              </button>
            )}

            {group.hotels.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                <HotelIcon size={40} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">No hotels in this group</h3>
                {isOwner && <p className="text-sm text-gray-400 mt-1">Add your first hotel to get started</p>}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.hotels.map(hotel => (
                  <div key={hotel.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <HotelIcon size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-[15px]">{hotel.name}</h4>
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                            <MapPin size={13} />
                            {hotel.location || 'Location not set'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        hotel.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {hotel.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {hotel.rating > 0 ? hotel.rating.toFixed(1) : '—'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">{hotel.reviewCount.toLocaleString()} reviews</span>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveHotel(hotel.id)}
                          className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                          title="Remove hotel"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div>
            {canManageMembers && (
              <button
                onClick={() => setShowInviteHotel(true)}
                className="flex items-center gap-2 mb-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={16} />
                Invite Hotel
              </button>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              {group.members.map((member, idx) => {
                const badge = roleBadge[member.role] || roleBadge['member'];
                const canModify = isOwner && member.role !== 'owner';

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between px-5 py-4 ${idx > 0 ? 'border-t border-gray-50 dark:border-slate-700' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">{member.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 mr-2">Joined {member.joinedAt}</span>
                      {canModify && (
                        <div className="relative">
                          <button
                            onClick={() => setMemberMenuId(memberMenuId === member.id ? null : member.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {memberMenuId === member.id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 py-1 w-48 z-10">
                              {member.role === 'member' && (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'manager')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                  <ChevronUp size={14} />
                                  Promote to Manager
                                </button>
                              )}
                              {member.role === 'owner' && (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'member')}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                  <ChevronDown size={14} />
                                  Demote to Member
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={14} />
                                Remove Member
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role Permissions Info */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Role Permissions</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    <Crown size={12} /> Owner / Manager
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>Create &amp; delete group</li>
                    <li>Add &amp; remove hotels</li>
                    <li>Invite &amp; remove members</li>
                    <li>Full management access</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    <Eye size={12} /> Member
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>View group analytics</li>
                    <li>View hotel data</li>
                    <li>View member list</li>
                    <li>Read-only access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Invite Hotel Modal */}
      {showInviteHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowInviteHotel(false); setInviteLink(''); setInviteEmail(''); }} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {inviteLink ? 'Invitation Sent' : 'Invite Hotel'}
              </h2>
              <button 
                onClick={() => { setShowInviteHotel(false); setInviteLink(''); setInviteEmail(''); }} 
                className="p-2 mr-[-8px] rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              {inviteLink ? (
                <div className="flex flex-col items-center space-y-5">
                  <div className="h-14 w-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center space-y-1.5">
                    <p className="text-gray-900 dark:text-white font-semibold">Success!</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      An invitation email has been sent to <span className="font-medium text-gray-700 dark:text-gray-300">{inviteEmail}</span>.
                    </p>
                  </div>
                  
                  <div className="w-full pt-2">
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                      Or share link directly
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 p-2.5 bg-gray-50 dark:bg-slate-900/50 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-nowrap">
                        {inviteLink}
                      </div>
                      <button 
                        onClick={copyToClipboard}
                        className="p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => { setShowInviteHotel(false); setInviteLink(''); setInviteEmail(''); }} 
                    className="w-full mt-2 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Hotel Name</label>
                    <input
                      type="text"
                      value={inviteHotelName}
                      onChange={e => setInviteHotelName(e.target.value)}
                      placeholder="e.g., Cinnamon Grand Colombo"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={inviteHotelLocation}
                      onChange={e => setInviteHotelLocation(e.target.value)}
                      placeholder="e.g., Colombo, Sri Lanka"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Representative Email</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="rep@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 flex items-start gap-1">
                      <ArrowLeft size={12} className="mt-0.5 flex-shrink-0 rotate-180" />
                      They will receive a secure sign-up link to add the hotel.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-6">
                    <button type="button" onClick={() => setShowInviteHotel(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleHotelInvite} disabled={!inviteEmail.trim() || !inviteHotelName.trim()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm">
                      Send Invitation
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;
