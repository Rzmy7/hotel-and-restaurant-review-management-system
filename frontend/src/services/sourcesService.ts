import type { Source, SyncLog, SourceStats, SourceStatus, SyncSchedule } from '../types/sources';

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

const API_BASE_URL = 'http://localhost:8000';

class SourcesService {
    async getPlatforms(): Promise<any[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/platforms`);
            if (!response.ok) throw new Error('Failed to fetch platforms');
            return await response.json();
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
            status: (s.source_status.charAt(0).toUpperCase() + s.source_status.slice(1)) as SourceStatus,
            lastSyncedAt: s.last_synced_at,
            syncSchedule: (s.fetching_frequency.charAt(0).toUpperCase() + s.fetching_frequency.slice(1)) as SyncSchedule,
            propertyUrl: s.source_url,
            successRate: Math.round(s.success_rate * 100),
            errorCount: 0, 
            nextRunAt: s.next_synced_at,
            createdAt: s.created_at,
        };
    }

    async getSources(tenantId: string, organizationId: string): Promise<Source[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/tenants/${tenantId}/organizations/${organizationId}/sources`);
            if (!response.ok) throw new Error('Backend error');
            const data = await response.json();
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
            const response = await fetch(`${API_BASE_URL}/source/tenants/${tenantId}/organizations/${organizationId}/sources`);
            if (!response.ok) throw new Error('Backend error');
            const data = await response.json();
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
            const response = await fetch(`${API_BASE_URL}/source/tenants/${tenantId}/organizations/${organizationId}/sync-logs?skip=${skip}&limit=${limit}`);
            if (!response.ok) throw new Error('Failed to fetch sync logs');
            return await response.json();
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
            const response = await fetch(`${API_BASE_URL}/source/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: tenantId,
                    organization_id: organizationId,
                    platform_id: sourceData.platformId,
                    source_url: sourceData.propertyUrl,
                    source_status: sourceData.status.toLowerCase(),
                    fetching_frequency: sourceData.syncSchedule.toLowerCase(),
                }),
            });

            if (!response.ok) throw new Error('Failed to add source');
            const newSource = await response.json();
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

            const response = await fetch(`${API_BASE_URL}/source/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Update failed');
            const data = await response.json();
            return this.mapBackendSourceToFrontend(data);
        } catch (error) {
            console.error('Update source failed:', error);
            throw error;
        }
    }

    async deleteSource(id: string | number): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
        } catch (error) {
            console.error('Delete source failed:', error);
            throw error;
        }
    }

    async triggerSync(id: string | number): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/${id}/sync`, { method: 'POST' });
            if (!response.ok) throw new Error('Sync failed');
        } catch (error) {
            console.error('Sync trigger failed:', error);
            throw error;
        }
    }
}

export const sourcesService = new SourcesService();
