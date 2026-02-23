export type SourcePlatform =
    | 'TripAdvisor'
    | 'Booking.com'
    | 'Google Reviews'
    | 'Airbnb'
    | 'Agoda'
    | 'Expedia'
    | 'Yelp'
    | 'Zomato'
    | 'OpenTable'
    | 'Hotels.com'
    | 'Custom';

export type SourceStatus = 'Active' | 'Paused' | 'Error';

export type SyncStatus = 'Success' | 'Failed' | 'In Progress';

export type SyncSchedule = 'Hourly' | 'Daily' | 'Weekly';

export interface Source {
    id: number;
    platform: SourcePlatform;
    status: SourceStatus;
    lastSyncedAt: string | null;
    syncSchedule: SyncSchedule;
    propertyUrl: string;
    successRate: number;
    errorCount: number;
    nextRunAt: string | null;
    createdAt: string;
}

export interface SyncLog {
    id: string;
    sourceId: number;
    platform: SourcePlatform;
    status: SyncStatus;
    timestamp: string;
    durationMs: number;
    reviewsFetched: number;
    errorMessage?: string;
}

export interface SourceStats {
    totalSources: number;
    activeSources: number;
    pausedSources: number;
    errorSources: number;
    totalReviewsFetched: number;
}
