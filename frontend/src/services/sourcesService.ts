import type { Source, SyncLog, SourceStats, SourceStatus, SyncSchedule } from '../types/sources';
import { apiClient } from '../api/client';

// Mock Data
const MOCK_SOURCES: Source[] = [
    {
        id: 1,
        platformId: 1,
        platform: 'TripAdvisor',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        syncSchedule: 'daily',
        propertyUrl: 'https://tripadvisor.com/hotel/1',
        successRate: 98,
        num_of_syncs: 50,
        success_sync_count: 49,
        platform_num_of_syncs: 1000,
        platform_success_sync_count: 950,
        errorCount: 0,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 58).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
        id: 2,
        platformId: 2,
        platform: 'Booking.com',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        syncSchedule: 'three_days',
        propertyUrl: 'https://booking.com/hotel/2',
        successRate: 100,
        num_of_syncs: 20,
        success_sync_count: 20,
        platform_num_of_syncs: 800,
        platform_success_sync_count: 780,
        errorCount: 0,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 23.75).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    },
    {
        id: 3,
        platformId: 3,
        platform: 'Google Reviews',
        status: 'Paused',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        syncSchedule: 'daily',
        propertyUrl: 'https://google.com/maps/place/3',
        successRate: 85,
        num_of_syncs: 10,
        success_sync_count: 8,
        platform_num_of_syncs: 500,
        platform_success_sync_count: 450,
        errorCount: 12,
        nextRunAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    },
    {
        id: 4,
        platformId: 4,
        platform: 'Airbnb',
        status: 'Error',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        syncSchedule: 'weekly',
        propertyUrl: 'https://airbnb.com/rooms/4',
        successRate: 45,
        num_of_syncs: 5,
        success_sync_count: 2,
        platform_num_of_syncs: 200,
        platform_success_sync_count: 150,
        errorCount: 3,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
        id: 5,
        platformId: 5,
        platform: 'Agoda',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        syncSchedule: 'daily',
        propertyUrl: 'https://agoda.com/hotel/5',
        successRate: 92,
        num_of_syncs: 15,
        success_sync_count: 14,
        platform_num_of_syncs: 400,
        platform_success_sync_count: 380,
        errorCount: 2,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    },
];

const MOCK_SYNC_LOGS: SyncLog[] = [
    {
        id: 'log-1',
        sourceId: 1,
        platform: 'TripAdvisor',
        status: 'Success',
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        durationMs: 4500,
        reviewsFetched: 12,
    },
    {
        id: 'log-2',
        sourceId: 4,
        platform: 'Airbnb',
        status: 'Failed',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        durationMs: 1200,
        reviewsFetched: 0,
        errorMessage: 'Authentication failed: Invalid session token',
    },
    {
        id: 'log-3',
        sourceId: 2,
        platform: 'Booking.com',
        status: 'Success',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        durationMs: 8200,
        reviewsFetched: 45,
    },
];

class SourcesService {
    async getPlatforms(): Promise<any[]> {
        try {
            return await apiClient.get<any[]>('/api/source/platforms');
        } catch (error) {
            console.error('Fetch platforms failed:', error);
            return [];
        }
    }

    private mapBackendSourceToFrontend(s: any): Source {
        return {
            id: s.source_id,
            platformId: s.platform_id,
            platform: s.platform_name,
            status: (() => {
                const s_lower = s.source_status.toLowerCase();
                if (s_lower === 'queued') return 'In Queue';
                if (s_lower === 'running') return 'Syncing';
                return (s_lower.charAt(0).toUpperCase() + s_lower.slice(1)) as SourceStatus;
            })(),
            lastSyncedAt: s.last_synced_at,
            syncSchedule: (s.fetching_frequency.charAt(0).toUpperCase() + s.fetching_frequency.slice(1)) as SyncSchedule,
            propertyUrl: s.source_url,
            successRate: s.success_rate,
            num_of_syncs: s.num_of_syncs,
            success_sync_count: s.success_sync_count,
            platform_num_of_syncs: s.platform_num_of_syncs,
            platform_success_sync_count: s.platform_success_sync_count,
            errorCount: 0,
            nextRunAt: s.next_synced_at,
            createdAt: s.created_at,
        };
    }

    async getSources(tenantId: string, organizationId: string): Promise<Source[]> {
        try {
            const data = await apiClient.get<{ sources: any[] }>(`/api/source/tenants/${tenantId}/organizations/${organizationId}/sources`);
            return data.sources.map((s: any) => this.mapBackendSourceToFrontend(s));
        } catch (error) {
            console.warn('Backend fetch failed, falling back to mock data:', error);
            return new Promise((resolve) => {
                setTimeout(() => resolve([...MOCK_SOURCES]), 300);
            });
        }
    }

    async getStats(tenantId: string, organizationId: string): Promise<SourceStats> {
        try {
            const data = await apiClient.get<any>(`/api/source/tenants/${tenantId}/organizations/${organizationId}/sources`);
            return {
                totalSources: data.stats.total_sources,
                activeSources: data.stats.active_sources,
                pausedSources: data.stats.paused_sources,
                errorSources: data.stats.sync_error_count,
                totalReviewsFetched: 1540,
            };
        } catch (error) {
            const sources = MOCK_SOURCES;
            return {
                totalSources: sources.length,
                activeSources: sources.filter(s => s.status === 'Active').length,
                pausedSources: sources.filter(s => s.status === 'Paused').length,
                errorSources: sources.filter(s => s.status === 'Error').length,
                totalReviewsFetched: 1540,
            };
        }
    }

    async getSyncLogs(tenantId: string, organizationId: string, page: number = 0, limit: number = 10): Promise<SyncLog[]> {
        const skip = page * limit;
        try {
            return await apiClient.get<SyncLog[]>(`/api/source/tenants/${tenantId}/organizations/${organizationId}/sync-logs?skip=${skip}&limit=${limit}`);
        } catch (error) {
            console.warn('Backend fetch for sync logs failed, falling back to mock data:', error);
            return new Promise((resolve) => {
                // For mock, just return a slice if it's the first page
                const start = page * limit;
                const end = start + limit;
                setTimeout(() => resolve(MOCK_SYNC_LOGS.slice(start, end)), 300);
            });
        }
    }

    async addSource(tenantId: string, organizationId: string, sourceData: any): Promise<Source> {
        try {
            const newSource = await apiClient.post<any>('/api/source/', {
                tenant_id: tenantId,
                organization_id: organizationId,
                platform_id: sourceData.platformId,
                source_url: sourceData.propertyUrl,
                source_status: sourceData.status.toLowerCase(),
                fetching_frequency: sourceData.syncSchedule.toLowerCase(),
            });

            return this.mapBackendSourceToFrontend(newSource);
        } catch (error) {
            console.error('Add source failed:', error);
            throw error;
        }
    }

    async updateSource(id: string | number, updates: Partial<Source>): Promise<Source> {
        try {
            const payload: any = {};
            if (updates.propertyUrl) payload.source_url = updates.propertyUrl;
            if (updates.status) payload.source_status = updates.status.toLowerCase();
            if (updates.syncSchedule) payload.fetching_frequency = updates.syncSchedule.toLowerCase();

            const data = await apiClient.patch<any>(`/api/source/${id}`, payload);
            return this.mapBackendSourceToFrontend(data);
        } catch (error) {
            console.error('Update source failed:', error);
            throw error;
        }
    }

    async deleteSource(id: string | number): Promise<void> {
        try {
            await apiClient.delete(`/api/source/${id}`);
        } catch (error) {
            console.error('Delete source failed:', error);
            throw error;
        }
    }

    async triggerSync(id: string | number): Promise<void> {
        try {
            await apiClient.post(`/api/source/${id}/sync`);
        } catch (error) {
            console.error('Sync trigger failed:', error);
            throw error;
        }
    }
}

export const sourcesService = new SourcesService();
