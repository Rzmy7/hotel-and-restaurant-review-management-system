/**
 * Sources Service — real API only, no mock fallback.
 */

import type { Source, SyncLog, SourceStats, SourceStatus, SyncSchedule } from '../types/sources';
import { apiClient } from '../api/client';

class SourcesService {
    async getPlatforms(): Promise<any[]> {
        return apiClient.get<any[]>('/api/source/platforms');
    }

    private mapBackendSourceToFrontend(s: any): Source {
        return {
            id: s.source_id,
            platformId: s.platform_id,
            platform: s.platform_name,
            status: (() => {
                const lower = (s.source_status || '').toLowerCase();
                if (lower === 'queued')  return 'In Queue';
                if (lower === 'running') return 'Syncing';
                return (lower.charAt(0).toUpperCase() + lower.slice(1)) as SourceStatus;
            })(),
            lastSyncedAt: s.last_synced_at,
            syncSchedule: (() => {
                const map: Record<number, string> = { 1: 'Daily', 2: 'Three_days', 3: 'Weekly' };
                const freq = typeof s.fetching_frequency === 'number' 
                    ? (map[s.fetching_frequency] || 'Daily') 
                    : String(s.fetching_frequency);
                return (freq.charAt(0).toUpperCase() + freq.slice(1)) as SyncSchedule;
            })(),
            propertyUrl:  s.source_url,
            successRate:  s.success_rate,
            num_of_syncs:                s.num_of_syncs,
            success_sync_count:          s.success_sync_count,
            platform_num_of_syncs:       s.platform_num_of_syncs,
            platform_success_sync_count: s.platform_success_sync_count,
            errorCount: 0,
            nextRunAt:  s.next_synced_at,
            createdAt:  s.created_at,
        };
    }

    async getSources(organizationId: string): Promise<Source[]> {
        const data = await apiClient.get<{ sources: any[] }>(`/api/source/organizations/${organizationId}/sources`);
        return data.sources.map((s: any) => this.mapBackendSourceToFrontend(s));
    }

    async getStats(organizationId: string): Promise<SourceStats> {
        const data = await apiClient.get<any>(`/api/source/organizations/${organizationId}/sources`);
        return {
            totalSources:        data.stats.total_sources,
            activeSources:       data.stats.active_sources,
            pausedSources:       data.stats.paused_sources,
            errorSources:        data.stats.sync_error_count,
            totalReviewsFetched: data.stats.total_reviews_fetched ?? 0,
        };
    }

    async getSyncLogs(organizationId: string, page: number = 0, limit: number = 10): Promise<SyncLog[]> {
        const skip = page * limit;
        return apiClient.get<SyncLog[]>(`/api/source/organizations/${organizationId}/sync-logs?skip=${skip}&limit=${limit}`);
    }

    async addSource(organizationId: string, sourceData: any): Promise<Source> {
        const scheduleMapReverse: Record<string, number> = { 'daily': 1, 'three_days': 2, 'weekly': 3 };
        const scheduleStr = (sourceData.syncSchedule || 'daily').toLowerCase();
        
        const newSource = await apiClient.post<any>('/api/source/', {
            organization_id:   organizationId,
            platform_id:       sourceData.platformId,
            source_url:        sourceData.propertyUrl,
            source_status:     sourceData.status.toLowerCase(),
            fetching_frequency: scheduleMapReverse[scheduleStr] || 1,
        });
        return this.mapBackendSourceToFrontend(newSource);
    }

    async updateSource(id: string | number, updates: Partial<Source>): Promise<Source> {
        const payload: any = {};
        if (updates.propertyUrl)  payload.source_url        = updates.propertyUrl;
        if (updates.status)       payload.source_status      = updates.status.toLowerCase();
        if (updates.syncSchedule) {
            const scheduleMapReverse: Record<string, number> = { 'daily': 1, 'three_days': 2, 'weekly': 3 };
            const scheduleStr = updates.syncSchedule.toLowerCase();
            payload.fetching_frequency = scheduleMapReverse[scheduleStr] || 1;
        }
        const data = await apiClient.patch<any>(`/api/source/${id}`, payload);
        return this.mapBackendSourceToFrontend(data);
    }

    async deleteSource(id: string | number): Promise<void> {
        await apiClient.delete(`/api/source/${id}`);
    }

    async triggerSync(id: string | number): Promise<void> {
        await apiClient.post(`/api/source/${id}/sync`);
    }
}

export const sourcesService = new SourcesService();
