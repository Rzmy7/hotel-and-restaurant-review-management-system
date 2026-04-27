/**
 * Centralized constants for Review Sources domain.
 */

export const SOURCE_STATUS = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  ERROR: "Error",
  IN_QUEUE: "In Queue",
  SYNCING: "Syncing",
} as const;

export const SYNC_SCHEDULE = {
  DAILY: "daily",
  THREE_DAYS: "three_days",
  WEEKLY: "weekly",
} as const;

export const SOURCE_PLATFORM = {
  TRIPADVISOR: "TripAdvisor",
  BOOKING: "Booking.com",
  GOOGLE: "Google Reviews",
  AIRBNB: "Airbnb",
  AGODA: "Agoda",
  EXPEDIA: "Expedia",
  YELP: "Yelp",
  ZOMATO: "Zomato",
  OPENTABLE: "OpenTable",
  HOTELS: "Hotels.com",
  CUSTOM: "Custom",
} as const;

export const SYNC_STATUS = {
  SUCCESS: "Success",
  FAILED: "Failed",
  IN_PROGRESS: "In Progress",
} as const;

export type SourceStatusValue = (typeof SOURCE_STATUS)[keyof typeof SOURCE_STATUS];
export type SyncScheduleValue = (typeof SYNC_SCHEDULE)[keyof typeof SYNC_SCHEDULE];
export type SourcePlatformValue = (typeof SOURCE_PLATFORM)[keyof typeof SOURCE_PLATFORM];
export type SyncStatusValue = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];
