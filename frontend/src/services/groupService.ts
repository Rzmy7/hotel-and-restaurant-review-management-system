/**
 * Group Service — all API calls for groups, invitations, and analytics.
 */

import { apiClient } from '../api/client';

// ---------- Types ----------

export type GroupRole = 'GROUP_OWNER' | 'GROUP_MANAGER' | 'GROUP_MEMBER';

export interface GroupMemberItem {
    user_id: string;
    name: string;
    email: string;
    role: GroupRole;
    joined_at: string | null;
}

export interface PendingInvitation {
    invitation_id: string;
    invited_email: string;
    role: GroupRole;
    created_at: string | null;
}

export interface Group {
    group_id: string;
    group_name: string;
    description: string | null;
    parent_group_id: string | null;
    created_by: string;
    created_at: string | null;
    member_count: number;
    my_role: GroupRole;
}

export interface GroupDetail extends Group {
    members: GroupMemberItem[];
    pending_invitations: PendingInvitation[];
}

export interface GroupAnalyticsSummary {
    avg_rating: number;
    review_count: number;
    positive_pct: number;
    negative_pct: number;
}

export interface OrgAnalytics {
    org_id: string;
    org_name: string;
    avg_rating: number;
    review_count: number;
    positive_pct: number;
    negative_pct: number;
}

export interface GroupAnalytics {
    group_name: string;
    summary: GroupAnalyticsSummary;
    per_org: OrgAnalytics[];
}

export interface MyPendingInvite {
    invitation_id: string;
    group_id: string;
    group_name: string;
    invited_by_name: string;
    role: GroupRole;
    created_at: string | null;
}

// ---------- API Functions ----------

export async function fetchGroups(): Promise<Group[]> {
    return apiClient.get<Group[]>('/groups');
}

export async function fetchSubgroups(): Promise<Group[]> {
    return apiClient.get<Group[]>('/groups/subgroups');
}

export async function fetchGroupDetail(groupId: string): Promise<GroupDetail> {
    return apiClient.get<GroupDetail>(`/groups/${groupId}`);
}

export async function createGroup(payload: {
    group_name: string;
    description?: string;
    parent_group_id?: string;
}): Promise<Group> {
    return apiClient.post<Group>('/groups', payload);
}

export async function updateGroup(groupId: string, payload: {
    group_name?: string;
    description?: string;
}): Promise<Group> {
    return apiClient.patch<Group>(`/groups/${groupId}`, payload);
}

export async function deleteGroup(groupId: string): Promise<void> {
    return apiClient.delete<void>(`/groups/${groupId}`);
}

export async function inviteMember(groupId: string, email: string, role: GroupRole): Promise<{ message: string; invitation_id: string }> {
    return apiClient.post(`/groups/${groupId}/invite`, { email, role });
}

export async function respondToInvitation(groupId: string, invitationId: string, action: 'accept' | 'reject'): Promise<{ message: string }> {
    return apiClient.post(`/groups/${groupId}/invitations/${invitationId}/respond`, { action });
}

export async function removeMember(groupId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/groups/${groupId}/members/${userId}`);
}

export async function changeMemberRole(groupId: string, userId: string, role: GroupRole): Promise<{ message: string }> {
    return apiClient.patch(`/groups/${groupId}/members/${userId}/role`, { role });
}

export async function fetchGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
    return apiClient.get<GroupAnalytics>(`/groups/${groupId}/analytics`);
}

export async function fetchMyPendingInvitations(): Promise<MyPendingInvite[]> {
    return apiClient.get<MyPendingInvite[]>('/groups/invitations/pending');
}

export function roleLabel(role: GroupRole): string {
    switch (role) {
        case 'GROUP_OWNER':   return 'Owner';
        case 'GROUP_MANAGER': return 'Manager';
        default:              return 'Member';
    }
}

export function roleColor(role: GroupRole): string {
    switch (role) {
        case 'GROUP_OWNER':   return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30';
        case 'GROUP_MANAGER': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30';
        default:              return 'text-gray-600 bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600';
    }
}
