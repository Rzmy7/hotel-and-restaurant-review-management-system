import type { Source, SyncLog, SourceStats } from '../types/sources';

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

class SourcesService {
    async getSources(): Promise<Source[]> {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => resolve([...MOCK_SOURCES]), 500);
        });
    }

    async getStats(): Promise<SourceStats> {
        const sources = await this.getSources();
        return {
            totalSources: sources.length,
            activeSources: sources.filter(s => s.status === 'Active').length,
            pausedSources: sources.filter(s => s.status === 'Paused').length,
            errorSources: sources.filter(s => s.status === 'Error').length,
            totalReviewsFetched: 1540, // Mock value
        };
    }

    async getSyncLogs(): Promise<SyncLog[]> {
        return new Promise((resolve) => {
            setTimeout(() => resolve([...MOCK_SYNC_LOGS]), 500);
        });
    }

    async addSource(source: Omit<Source, 'id' | 'lastSyncedAt' | 'successRate' | 'errorCount' | 'nextRunAt' | 'createdAt'>): Promise<Source> {
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

    async updateSource(id: number, updates: Partial<Source>): Promise<Source> {
        const index = MOCK_SOURCES.findIndex(s => s.id === id);
        if (index === -1) throw new Error('Source not found');

        MOCK_SOURCES[index] = { ...MOCK_SOURCES[index], ...updates };
        return MOCK_SOURCES[index];
    }

    async deleteSource(id: number): Promise<void> {
        const index = MOCK_SOURCES.findIndex(s => s.id === id);
        if (index !== -1) {
            MOCK_SOURCES.splice(index, 1);
        }
    }

    async triggerSync(id: number): Promise<void> {
        console.log(`Triggering sync for source ${id}`);
        // Mock sync logic
    }
}

export const sourcesService = new SourcesService();
