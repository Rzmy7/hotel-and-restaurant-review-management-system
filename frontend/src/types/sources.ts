export type SourcePlatform =
  | "TripAdvisor"
  | "Booking.com"
  | "Google Reviews"
  | "Airbnb"
  | "Agoda"
  | "Expedia"
  | "Yelp"
  | "Zomato"
  | "OpenTable"
  | "Hotels.com"
  | "Custom";

export type SourceStatus =
  | "Active"
  | "Paused"
  | "Error"
  | "In Queue"
  | "Syncing";

export type SyncStatus = "Success" | "Failed" | "In Progress";

export type SyncSchedule = "daily" | "three_days" | "weekly";

export interface Source {
  id: string | number;
  platformId: number;
  platform: SourcePlatform;
  platformStatus: "active" | "inactive";
  status: SourceStatus;
  lastSyncedAt: string | null;
  syncSchedule: SyncSchedule;
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

export interface SyncLog {
  id: string | number;
  sourceId: string | number;
  platform: SourcePlatform;
  status: SyncStatus;
  timestamp: string;
  durationMs: number;
  reviewsFetched: number;
  errorMessage?: string;
  activityType?: string;
  isImportant?: boolean;
  activityDetails?: string;
}

export interface SourceStats {
  totalSources: number;
  activeSources: number;
  pausedSources: number;
  errorSources: number;
  totalReviewsFetched: number;
}
