import { apiClient } from '../api/client';

export interface GroupSettings {
  can_members_invite: boolean;
  show_members_to_members: boolean;
  show_analytics_to_members: boolean;
}

export interface Group {
  group_id: string;
  group_name: string;
  description: string | null;
  avatar_url: string | null;
  is_private: boolean;
  settings: GroupSettings;

  created_by: string;
  created_at: string;
  member_count: number;
  my_role: 'GROUP_OWNER' | 'GROUP_MEMBER';
}

/** A member of a group — the member entity is an Organization, represented here by the org's owner account. */
export interface GroupMember {
  user_id: string;            // org owner's user ID (used as the remove key)
  organization_id?: string;
  organization_name?: string; // display name of the member org
  first_name: string | null;  // owner first name (fallback display)
  last_name: string | null;
  email: string;              // owner email
  profile_image_url: string | null;
  job_title: string | null;
  role: 'GROUP_OWNER' | 'GROUP_MEMBER';
  joined_at: string;
}

/** An invitation sent to an Organization to join a group. */
export interface GroupInvite {
  invite_id: string;
  group_id: string;
  group_name?: string;                   // populated when received by the invitee
  invited_by_name: string | null;        // name of the inviting org's owner
  invited_by_org_name?: string | null;   // name of the inviting organization
  // invited organization fields
  invited_org_id?: string | null;
  invited_org_name?: string | null;      // preferred display field
  invited_user_id?: string | null;       // kept for legacy compat
  invited_user_name?: string | null;
  invited_user_email?: string | null;
  invite_type: 'organization' | 'link';
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
  message: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface Organization {
  organization_id: string;
  organization_name: string;
  location_url: string | null;
  type_name: string | null;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
}

export interface GroupAnalytics {
  member_count: number;
  total_reviews: number;
  avg_rating: number | null;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  invite_stats: {
    total_sent: number;
    pending_count: number;
    accepted_count: number;
    rejected_count: number;
  };
  recent_members: Array<{
    user_id: string;
    name: string;
    email: string;
    profile_image_url: string | null;
    role: string;
    joined_at: string;
  }>;
  member_orgs: Array<{
    organization_id: string;
    organization_name: string;
    owner_name: string;
    review_count: number;
    avg_rating: number | null;
    positive_count: number;
    negative_count: number;
    neutral_count: number;
  }>;
  reviews_over_time: Array<{ date: string; count: number }>;
  rating_distribution: Array<{ star: number; count: number }>;
}

export interface JoinLinkInfo {
  group_id: string;
  group_name: string;
  description: string | null;
  member_count: number;
  already_member: boolean;
}

export const groupsService = {
  // ── Groups ──────────────────────────────────────────────────────

  /** List groups for a specific organization (org-scoped). */
  async listGroups(organizationId: string): Promise<{ groups: Group[]; count: number }> {
    return apiClient.get('/groups', { organization_id: organizationId });
  },

  async searchPublicGroups(query: string): Promise<{ groups: Group[] }> {
    return apiClient.get('/groups/search-public', { q: query });
  },

  async joinPublicGroup(groupId: string): Promise<{ message: string; group_id: string }> {
    return apiClient.post(`/groups/${groupId}/join`);
  },

  async createGroup(organizationId: string, data: {
    group_name: string;
    description?: string;
    is_private?: boolean;
    settings?: Partial<GroupSettings>;
  }): Promise<{ group_id: string; group_name: string }> {
    return apiClient.post('/groups', { ...data, organization_id: organizationId });
  },

  async getGroup(groupId: string, organizationId: string): Promise<Group> {
    return apiClient.get(`/groups/${groupId}`, { organization_id: organizationId });
  },

  async updateGroup(groupId: string, data: {
    group_name?: string;
    description?: string;
    is_private?: boolean;
  }): Promise<{ message: string }> {
    return apiClient.put(`/groups/${groupId}`, data);
  },

  async deleteGroup(groupId: string): Promise<{ message: string }> {
    return apiClient.delete(`/groups/${groupId}`);
  },

  async leaveGroup(groupId: string): Promise<{ message: string }> {
    return apiClient.post(`/groups/${groupId}/leave`);
  },

  // ── Members ──────────────────────────────────────────────────────

  async listMembers(groupId: string): Promise<{ members: GroupMember[]; count: number }> {
    return apiClient.get(`/groups/${groupId}/members`);
  },

  /** Remove a member organization. Pass the organization_id (not user_id). */
  async removeMember(groupId: string, organizationId: string): Promise<{ message: string }> {
    return apiClient.delete(`/groups/${groupId}/members/${organizationId}`);
  },

  // ── Settings ─────────────────────────────────────────────────────

  async getSettings(groupId: string): Promise<GroupSettings> {
    return apiClient.get(`/groups/${groupId}/settings`);
  },

  async updateSettings(groupId: string, settings: GroupSettings): Promise<{ message: string }> {
    return apiClient.put(`/groups/${groupId}/settings`, settings);
  },

  // ── Analytics ────────────────────────────────────────────────────

  async getAnalytics(groupId: string): Promise<GroupAnalytics> {
    return apiClient.get(`/groups/${groupId}/analytics`);
  },

  // ── Invites ───────────────────────────────────────────────────────

  async listGroupInvites(groupId: string): Promise<{ invites: GroupInvite[]; count: number }> {
    return apiClient.get(`/groups/${groupId}/invites`);
  },

  async sendInvite(groupId: string, data: {
    organization_id: string;
    message?: string;
  }): Promise<{ invite_id: string }> {
    return apiClient.post(`/groups/${groupId}/invites`, data);
  },

  async cancelInvite(groupId: string, inviteId: string): Promise<{ message: string }> {
    return apiClient.delete(`/groups/${groupId}/invites/${inviteId}`);
  },

  // ── My invites (as invitee) ───────────────────────────────────────

  async getMyInvites(): Promise<{ invites: GroupInvite[]; count: number }> {
    return apiClient.get('/groups/invites/my');
  },

  async acceptInvite(inviteId: string): Promise<{ message: string }> {
    return apiClient.post(`/groups/invites/${inviteId}/accept`);
  },

  async rejectInvite(inviteId: string): Promise<{ message: string }> {
    return apiClient.post(`/groups/invites/${inviteId}/reject`);
  },

  // ── Invite Links ──────────────────────────────────────────────────

  async getJoinInfo(token: string): Promise<JoinLinkInfo> {
    return apiClient.get(`/groups/join/${token}`);
  },

  async joinViaLink(token: string): Promise<{ message: string; group_id: string }> {
    return apiClient.post(`/groups/join/${token}`);
  },
  // ── Organization search ───────────────────────────────────────────

  async searchOrganizations(query: string): Promise<{ organizations: Organization[] }> {
    return apiClient.get('/groups/search-organizations', { q: query });
  },
};
