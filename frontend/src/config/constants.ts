/**
 * Application-wide constants for the User Frontend.
 */

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 100,
};

export const UI_DEFAULTS = {
  ANONYMOUS_USER: "Anonymous",
  DEFAULT_LANGUAGE: "English",
  PLACEHOLDER_AVATAR: "https://via.placeholder.com/150",
};

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_MAIN_BACKEND_URL || "http://localhost:8000",
  TIMEOUT: 10000,
};
