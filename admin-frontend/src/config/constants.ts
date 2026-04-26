/**
 * Application-wide constants for the Admin Frontend.
 */

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  RECENT_ITEMS_LIMIT: 5,
};

export const SCRAPING_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  DEFAULT_REVIEW_LIMIT: 100,
};

export const STATUS_COLORS = {
  SUCCESS: "#10B981",
  WARNING: "#F59E0B",
  ERROR: "#EF4444",
  INFO: "#3B82F6",
};

export const API_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_MAIN_BACKEND_URL || "http://localhost:8000",
  SCRAPER_URL: import.meta.env.VITE_SCRAPING_URL || "http://localhost:8001",
};
