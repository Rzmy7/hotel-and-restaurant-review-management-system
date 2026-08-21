// Ubiquitous Language: Review Ingestion & Sources Context
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

export type ReviewSourceStatus = 'Active' | 'Paused' | 'Error' | 'In Queue' | 'Syncing';
export type SourceStatus = ReviewSourceStatus; // Backward-compatibility alias

export type ReviewSyncStatus = 'Success' | 'Failed' | 'In Progress';
export type SyncStatus = ReviewSyncStatus; // Backward-compatibility alias

export type ReviewSyncSchedule = 'daily' | 'three_days' | 'weekly';
export type SyncSchedule = ReviewSyncSchedule; // Backward-compatibility alias

export interface ReviewSource {
    id: string | number;
    platformId: number;
    platform: SourcePlatform;
    platformStatus: 'active' | 'inactive';
    status: ReviewSourceStatus;
    lastSyncedAt: string | null;
    syncSchedule: ReviewSyncSchedule;
    propertyUrl: string;
    successRate: number;
    num_of_syncs: number;
    success_sync_count: number;
    platform_num_of_syncs: number;
    platform_success_sync_count: number;
    errorCount: number;
    nextRunAt: string | null;
    createdAt: string;
}
export type Source = ReviewSource; // Backward-compatibility alias

export interface ReviewSyncLog {
    id: string | number;
    sourceId: string | number;
    platform: SourcePlatform;
    status: ReviewSyncStatus;
    timestamp: string;
    durationMs: number;
    reviewsFetched: number;
    errorMessage?: string;
    activityType?: string;
    isImportant?: boolean;
    activityDetails?: string;
}
export type SyncLog = ReviewSyncLog; // Backward-compatibility alias

export interface ReviewSourceStats {
    totalSources: number;
    activeSources: number;
    pausedSources: number;
    errorSources: number;
    totalReviewsFetched: number;
}
export type SourceStats = ReviewSourceStats; // Backward-compatibility alias
