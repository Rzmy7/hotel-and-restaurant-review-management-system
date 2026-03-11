import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Hotel as HotelIcon, Users, Crown, Shield, Eye, Star,
  MapPin, Trash2, UserPlus, ChevronUp, ChevronDown, MoreVertical, X,
} from 'lucide-react';

type UserRole = 'owner' | 'manager' | 'member';
type ActiveTab = 'hotels' | 'members';

interface Member {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  joinedAt: string;
}

interface GroupHotel {
  id: number;
  name: string;
  location: string;
  rating: number;
  reviewCount: number;
  status: 'active' | 'pending';
}

interface GroupDetail {
  id: number;
  name: string;
  description: string;
  currentUserRole: UserRole;
  createdAt: string;
  hotels: GroupHotel[];
  members: Member[];
}

const MOCK_GROUPS: Record<string, GroupDetail> = {
  '1': {
    id: 1,
    name: 'Luxury Hotels Sri Lanka',
    description: 'Premium luxury hotel properties across Sri Lanka',
    currentUserRole: 'owner',
    createdAt: '2025-12-15',
    hotels: [
      { id: 1, name: 'Cinnamon Grand Colombo', location: 'Colombo, Sri Lanka', rating: 4.5, reviewCount: 1234, status: 'active' },
      { id: 2, name: 'Shangri-La Hambantota', location: 'Hambantota, Sri Lanka', rating: 4.7, reviewCount: 876, status: 'active' },
      { id: 3, name: 'Heritance Kandalama', location: 'Dambulla, Sri Lanka', rating: 4.3, reviewCount: 543, status: 'active' },
      { id: 4, name: 'Cape Weligama', location: 'Weligama, Sri Lanka', rating: 4.8, reviewCount: 321, status: 'pending' },
    ],
    members: [
      { id: 1, name: 'John Silva', email: 'john@example.com', role: 'owner', joinedAt: '2025-12-15' },
      { id: 2, name: 'Sarah Perera', email: 'sarah@example.com', role: 'manager', joinedAt: '2025-12-20' },
      { id: 3, name: 'Mike Fernando', email: 'mike@example.com', role: 'member', joinedAt: '2026-01-05' },
      { id: 4, name: 'Lisa De Silva', email: 'lisa@example.com', role: 'member', joinedAt: '2026-01-10' },
      { id: 5, name: 'Kamal Jayasinghe', email: 'kamal@example.com', role: 'member', joinedAt: '2026-01-15' },
      { id: 6, name: 'Nimal Bandara', email: 'nimal@example.com', role: 'manager', joinedAt: '2026-02-01' },
      { id: 7, name: 'Priya Wickrama', email: 'priya@example.com', role: 'member', joinedAt: '2026-02-10' },
      { id: 8, name: 'Dinesh Kumara', email: 'dinesh@example.com', role: 'member', joinedAt: '2026-02-20' },
    ],
  },
  '2': {
    id: 2,
    name: 'Beach Resorts Collection',
    description: 'Coastal and beach resort properties',
    currentUserRole: 'manager',
    createdAt: '2026-01-20',
    hotels: [
      { id: 10, name: 'Anantara Peace Haven', location: 'Tangalle, Sri Lanka', rating: 4.6, reviewCount: 654, status: 'active' },
      { id: 11, name: 'Mount Lavinia Hotel', location: 'Mount Lavinia, Sri Lanka', rating: 4.1, reviewCount: 1987, status: 'active' },
      { id: 12, name: 'Jetwing Lighthouse', location: 'Galle, Sri Lanka', rating: 4.4, reviewCount: 789, status: 'active' },
    ],
    members: [
      { id: 20, name: 'Amal Rathnayake', email: 'amal@example.com', role: 'owner', joinedAt: '2026-01-20' },
      { id: 21, name: 'You (Current User)', email: 'user@example.com', role: 'manager', joinedAt: '2026-01-22' },
      { id: 22, name: 'Ruwan Senanayake', email: 'ruwan@example.com', role: 'member', joinedAt: '2026-01-25' },
      { id: 23, name: 'Hasini Gunasekara', email: 'hasini@example.com', role: 'member', joinedAt: '2026-02-05' },
      { id: 24, name: 'Tharindu Perera', email: 'tharindu@example.com', role: 'member', joinedAt: '2026-02-15' },
    ],
  },
  '3': {
    id: 3,
    name: 'City Hotels Network',
    description: 'Urban hotel properties in major cities',
    currentUserRole: 'member',
    createdAt: '2026-02-10',
    hotels: [
      { id: 30, name: 'Hilton Colombo', location: 'Colombo, Sri Lanka', rating: 4.2, reviewCount: 2345, status: 'active' },
      { id: 31, name: 'Galadari Hotel', location: 'Colombo, Sri Lanka', rating: 3.9, reviewCount: 1567, status: 'active' },
      { id: 32, name: 'Kandy City Hotel', location: 'Kandy, Sri Lanka', rating: 4.0, reviewCount: 432, status: 'active' },
      { id: 33, name: 'Earl\'s Regency', location: 'Kandy, Sri Lanka', rating: 4.3, reviewCount: 678, status: 'active' },
      { id: 34, name: 'Jaffna Heritage Hotel', location: 'Jaffna, Sri Lanka', rating: 3.8, reviewCount: 210, status: 'pending' },
      { id: 35, name: 'Trinco Blu by Cinnamon', location: 'Trincomalee, Sri Lanka', rating: 4.1, reviewCount: 456, status: 'active' },
    ],
    members: [
      { id: 40, name: 'Chaminda Vaas', email: 'chaminda@example.com', role: 'owner', joinedAt: '2026-02-10' },
      { id: 41, name: 'Mahi Jayawardene', email: 'mahi@example.com', role: 'manager', joinedAt: '2026-02-12' },
      { id: 42, name: 'You (Current User)', email: 'user@example.com', role: 'member', joinedAt: '2026-02-15' },
      { id: 43, name: 'Lasith Malinga', email: 'lasith@example.com', role: 'member', joinedAt: '2026-02-18' },
      { id: 44, name: 'Angelo Mathews', email: 'angelo@example.com', role: 'member', joinedAt: '2026-02-20' },
      { id: 45, name: 'Dimuth Karunaratne', email: 'dimuth@example.com', role: 'manager', joinedAt: '2026-02-22' },
    ],
  },
  '4': {
    id: 4,
    name: 'Mountain Retreats',
    description: 'Hill country and mountain resort properties',
    currentUserRole: 'owner',
    createdAt: '2026-03-01',
    hotels: [
      { id: 50, name: 'Heritance Tea Factory', location: 'Nuwara Eliya, Sri Lanka', rating: 4.6, reviewCount: 567, status: 'active' },
      { id: 51, name: 'Grand Hotel Nuwara Eliya', location: 'Nuwara Eliya, Sri Lanka', rating: 4.2, reviewCount: 890, status: 'active' },
    ],
    members: [
      { id: 60, name: 'John Silva', email: 'john@example.com', role: 'owner', joinedAt: '2026-03-01' },
      { id: 61, name: 'Kumari Dissanayake', email: 'kumari@example.com', role: 'manager', joinedAt: '2026-03-03' },
      { id: 62, name: 'Saman Wijesuriya', email: 'saman@example.com', role: 'member', joinedAt: '2026-03-05' },
      { id: 63, name: 'Nadeesha Perera', email: 'nadeesha@example.com', role: 'member', joinedAt: '2026-03-08' },
    ],
  },
};

const roleBadge: Record<UserRole, { label: string; color: string; icon: React.ReactNode }> = {
  owner: { label: 'Owner', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Crown size={12} /> },
  manager: { label: 'Manager', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Shield size={12} /> },
  member: { label: 'Member', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: <Eye size={12} /> },
};

const GroupDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>('hotels');
  const [group, setGroup] = useState<GroupDetail | null>(id ? MOCK_GROUPS[id] || null : null);
  const [showAddHotel, setShowAddHotel] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [memberMenuId, setMemberMenuId] = useState<number | null>(null);

  // Add hotel form
  const [newHotelName, setNewHotelName] = useState('');
  const [newHotelLocation, setNewHotelLocation] = useState('');

  // Invite member form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');

  if (!group) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Group not found</h2>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-semibold"
          >
            &larr; Back to Groups
          </button>
        </div>
      </div>
    );
  }

  const isOwner = group.currentUserRole === 'owner';
  const isManager = group.currentUserRole === 'manager';
  const canManageMembers = isOwner || isManager;

  const handleAddHotel = () => {
    if (!newHotelName.trim() || !isOwner) return;
    const newHotel: GroupHotel = {
      id: Date.now(),
      name: newHotelName.trim(),
      location: newHotelLocation.trim() || 'Location TBD',
      rating: 0,
      reviewCount: 0,
      status: 'pending',
    };
    setGroup(prev => prev ? { ...prev, hotels: [...prev.hotels, newHotel] } : prev);
    setNewHotelName('');
    setNewHotelLocation('');
    setShowAddHotel(false);
  };

  const handleRemoveHotel = (hotelId: number) => {
    if (!isOwner) return;
    setGroup(prev => prev ? { ...prev, hotels: prev.hotels.filter(h => h.id !== hotelId) } : prev);
  };

  const handleInviteMember = () => {
    if (!inviteEmail.trim() || !canManageMembers) return;
    const newMember: Member = {
      id: Date.now(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: isOwner ? inviteRole : 'member',
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setGroup(prev => prev ? { ...prev, members: [...prev.members, newMember] } : prev);
    setInviteEmail('');
    setInviteRole('member');
    setShowInviteMember(false);
  };

  const handlePromoteMember = (memberId: number) => {
    if (!isOwner) return;
    setGroup(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map(m =>
          m.id === memberId ? { ...m, role: 'manager' as UserRole } : m
        ),
      };
    });
    setMemberMenuId(null);
  };

  const handleDemoteMember = (memberId: number) => {
    if (!isOwner) return;
    setGroup(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        members: prev.members.map(m =>
          m.id === memberId ? { ...m, role: 'member' as UserRole } : m
        ),
      };
    });
    setMemberMenuId(null);
  };

  const handleRemoveMember = (memberId: number) => {
    const member = group.members.find(m => m.id === memberId);
    if (!member || member.role === 'owner') return;
    if (isManager && member.role !== 'member') return;
    if (!isOwner && !isManager) return;
    setGroup(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : prev);
    setMemberMenuId(null);
  };

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
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleBadge[group.currentUserRole].color}`}
              >
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
                  {group.members.filter(m => m.role === 'manager' || m.role === 'owner').length}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Managers & Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl p-1 border border-gray-100 dark:border-slate-700 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('hotels')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'hotels'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <HotelIcon size={16} />
            Hotels ({group.hotels.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'members'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
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
                onClick={() => setShowAddHotel(true)}
                className="flex items-center gap-2 mb-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add Hotel
              </button>
            )}

            {group.hotels.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                <HotelIcon size={40} className="mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-semibold text-gray-600 dark:text-gray-300">No hotels in this group</h3>
                {isOwner && (
                  <p className="text-sm text-gray-400 mt-1">Add your first hotel to get started</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.hotels.map(hotel => (
                  <div
                    key={hotel.id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                          <HotelIcon size={18} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-[15px]">{hotel.name}</h4>
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                            <MapPin size={13} />
                            {hotel.location}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          hotel.status === 'active'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-orange-50 text-orange-600'
                        }`}
                      >
                        {hotel.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-amber-400 fill-amber-400" />
                          <span className="text-sm font-bold text-gray-900 dark:text-white">
                            {hotel.rating > 0 ? hotel.rating.toFixed(1) : '\u2014'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {hotel.reviewCount.toLocaleString()} reviews
                        </span>
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
                onClick={() => setShowInviteMember(true)}
                className="flex items-center gap-2 mb-5 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                <UserPlus size={16} />
                Invite Member
              </button>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
              {group.members.map((member, idx) => {
                const badge = roleBadge[member.role];
                const canModify = isOwner && member.role !== 'owner';
                const canRemove =
                  (isOwner && member.role !== 'owner') ||
                  (isManager && member.role === 'member');

                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between px-5 py-4 ${
                      idx > 0 ? 'border-t border-gray-50 dark:border-slate-700' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-sm font-bold text-gray-500 dark:text-gray-400">
                        {member.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white text-sm">
                            {member.name}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badge.color}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{member.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 mr-2">Joined {member.joinedAt}</span>
                      {(canModify || canRemove) && (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setMemberMenuId(memberMenuId === member.id ? null : member.id)
                            }
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {memberMenuId === member.id && (
                            <div className="absolute right-0 top-8 bg-white dark:bg-slate-700 rounded-xl shadow-xl border border-gray-100 dark:border-slate-600 py-1 w-48 z-10">
                              {canModify && member.role === 'member' && (
                                <button
                                  onClick={() => handlePromoteMember(member.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                  <ChevronUp size={14} />
                                  Promote to Manager
                                </button>
                              )}
                              {canModify && member.role === 'manager' && (
                                <button
                                  onClick={() => handleDemoteMember(member.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600"
                                >
                                  <ChevronDown size={14} />
                                  Demote to Member
                                </button>
                              )}
                              {canRemove && (
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 size={14} />
                                  Remove Member
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Role permissions info */}
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/50">
              <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Role Permissions</h4>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    <Crown size={12} /> Owner
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>Create & delete groups</li>
                    <li>Add & remove hotels</li>
                    <li>Promote & demote members</li>
                    <li>Full management access</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    <Shield size={12} /> Manager
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>Invite new members</li>
                    <li>Remove members</li>
                    <li>View all analytics</li>
                    <li>Manage group settings</li>
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-1 font-semibold text-gray-600 dark:text-gray-400 mb-1">
                    <Eye size={12} /> Member
                  </div>
                  <ul className="text-blue-700 dark:text-blue-300 space-y-0.5">
                    <li>View group analytics</li>
                    <li>View member list</li>
                    <li>View hotel data</li>
                    <li>Read-only access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Hotel Modal */}
      {showAddHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddHotel(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Hotel to Group</h2>
              <button
                onClick={() => setShowAddHotel(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Hotel Name
                </label>
                <input
                  type="text"
                  value={newHotelName}
                  onChange={e => setNewHotelName(e.target.value)}
                  placeholder="e.g., Cinnamon Grand Colombo"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  value={newHotelLocation}
                  onChange={e => setNewHotelLocation(e.target.value)}
                  placeholder="e.g., Colombo, Sri Lanka"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHotel(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddHotel}
                  disabled={!newHotelName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Add Hotel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInviteMember(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Invite Member</h2>
              <button
                onClick={() => setShowInviteMember(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
              </div>
              {isOwner && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Role
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setInviteRole('member')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        inviteRole === 'member'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-gray-200 dark:border-slate-600 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      Member
                    </button>
                    <button
                      onClick={() => setInviteRole('manager')}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                        inviteRole === 'manager'
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'border-gray-200 dark:border-slate-600 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      Manager
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteMember(false)}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteMember}
                  disabled={!inviteEmail.trim()}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetailPage;
