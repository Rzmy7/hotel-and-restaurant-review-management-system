import type { Source, SyncLog, SourceStats, SourceStatus, SyncSchedule } from '../types/sources';

// Mock Data
const MOCK_SOURCES: Source[] = [
    {
        id: 1,
        platform: 'TripAdvisor',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        syncSchedule: 'Hourly',
        propertyUrl: 'https://tripadvisor.com/hotel/1',
        successRate: 98,
        errorCount: 0,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 58).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    },
    {
        id: 2,
        platform: 'Booking.com',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        syncSchedule: 'Daily',
        propertyUrl: 'https://booking.com/hotel/2',
        successRate: 100,
        errorCount: 0,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 60 * 23.75).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    },
    {
        id: 3,
        platform: 'Google Reviews',
        status: 'Paused',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        syncSchedule: 'Hourly',
        propertyUrl: 'https://google.com/maps/place/3',
        successRate: 85,
        errorCount: 12,
        nextRunAt: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    },
    {
        id: 4,
        platform: 'Airbnb',
        status: 'Error',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        syncSchedule: 'Daily',
        propertyUrl: 'https://airbnb.com/rooms/4',
        successRate: 45,
        errorCount: 3,
        nextRunAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
        id: 5,
        platform: 'Agoda',
        status: 'Active',
        lastSyncedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
        syncSchedule: 'Hourly',
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

// Fixed IDs for development
const CURRENT_TENANT_ID = 'D7A3E7C9-8F2B-4B1A-9C1A-1A2B3C4D5E6F';
const CURRENT_ORG_ID = 'A1B2C3D4-E5F6-4A1B-8C2D-3E4F5A6B7C8D';
const API_BASE_URL = 'http://localhost:8001';

class SourcesService {
    private mapBackendSourceToFrontend(s: any): Source {
        return {
            id: s.source_id,
            platform: s.platform_name,
            status: (s.source_status.charAt(0).toUpperCase() + s.source_status.slice(1)) as SourceStatus,
            lastSyncedAt: s.last_synced_at,
            syncSchedule: (s.fetching_frequency.charAt(0).toUpperCase() + s.fetching_frequency.slice(1)) as SyncSchedule,
            propertyUrl: s.source_url,
            successRate: Math.round(s.success_rate * 100),
            errorCount: 0, // Not provided by backend yet
            nextRunAt: s.next_synced_at,
            createdAt: s.created_at,
        };
    }

    async getSources(): Promise<Source[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/tenants/${CURRENT_TENANT_ID}/organizations/${CURRENT_ORG_ID}/sources`);
            if (!response.ok) throw new Error('Backend unavailable');
            const data = await response.json();
            return data.sources.map((s: any) => this.mapBackendSourceToFrontend(s));
        } catch (error) {
            console.warn('Backend fetch failed, falling back to mock data:', error);
            return new Promise((resolve) => {
                setTimeout(() => resolve([...MOCK_SOURCES]), 300);
            });
        }
    }

    async getStats(): Promise<SourceStats> {
        try {
            const response = await fetch(`${API_BASE_URL}/source/tenants/${CURRENT_TENANT_ID}/organizations/${CURRENT_ORG_ID}/sources`);
            if (!response.ok) throw new Error('Backend unavailable');
            const data = await response.json();
            return {
                totalSources: data.stats.total_sources,
                activeSources: data.stats.active_sources,
                pausedSources: data.stats.paused_sources,
                errorSources: data.stats.sync_error_count,
                totalReviewsFetched: 1540, // Mock value as not implementation in backend yet
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

    async getSyncLogs(): Promise<SyncLog[]> {
        // Sync logs are not implemented in backend yet, strictly mock for now
        return new Promise((resolve) => {
            setTimeout(() => resolve([...MOCK_SYNC_LOGS]), 300);
        });
    }

    async addSource(source: Omit<Source, 'id' | 'lastSyncedAt' | 'successRate' | 'errorCount' | 'nextRunAt' | 'createdAt'>): Promise<Source> {
        try {
            // Find platform_id for the given platform name (this would normally be fetched)
            // For now, let's assume we can post it.
            // Actually, we should fetch platforms first to get the ID.
            const platformsRes = await fetch(`${API_BASE_URL}/source/platforms`);
            const platforms = await platformsRes.json();
            const platform = platforms.find((p: any) => p.platform_name === source.platform);

            const response = await fetch(`${API_BASE_URL}/source/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_id: CURRENT_TENANT_ID,
                    organization_id: CURRENT_ORG_ID,
                    platform_id: platform?.platform_id || 1,
                    source_url: source.propertyUrl,
                    source_status: source.status.toLowerCase(),
                    fetching_frequency: source.syncSchedule.toLowerCase(),
                }),
            });

            if (!response.ok) throw new Error('Failed to add source');
            const newSource = await response.json();
            return this.mapBackendSourceToFrontend(newSource);
        } catch (error) {
            console.error('Add source failed, using mock implementation:', error);
            const newSource: Source = {
                ...source,
                id: Math.floor(Math.random() * 100000),
                lastSyncedAt: null,
                successRate: 0,
                errorCount: 0,
                nextRunAt: source.status === 'Active' ? new Date(Date.now() + 1000 * 60 * 5).toISOString() : null,
                createdAt: new Date().toISOString(),
            };
            MOCK_SOURCES.push(newSource);
            return newSource;
        }
    }

    async updateSource(id: string | number, updates: Partial<Source>): Promise<Source> {
        try {
            if (typeof id === 'number') throw new Error('Mock ID cannot be updated on backend');

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
            const index = MOCK_SOURCES.findIndex(s => s.id === id);
            if (index === -1) throw new Error('Source not found');
            MOCK_SOURCES[index] = { ...MOCK_SOURCES[index], ...updates };
            return MOCK_SOURCES[index];
        }
    }

    async deleteSource(id: string | number): Promise<void> {
        try {
            if (typeof id === 'number') throw new Error('Mock ID');
            const response = await fetch(`${API_BASE_URL}/source/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Delete failed');
        } catch (error) {
            const index = MOCK_SOURCES.findIndex(s => s.id === id);
            if (index !== -1) MOCK_SOURCES.splice(index, 1);
        }
    }

    async triggerSync(id: string | number): Promise<void> {
        try {
            if (typeof id === 'number') throw new Error('Mock ID');
            const response = await fetch(`${API_BASE_URL}/source/${id}/sync`, { method: 'POST' });
            if (!response.ok) throw new Error('Sync failed');
        } catch (error) {
            console.log(`Triggering mock sync for source ${id}`);
        }
    }
}

export const sourcesService = new SourcesService();
