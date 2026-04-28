/**
 * Vitest global test setup for admin-frontend.
 */

import '@testing-library/jest-dom/vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock import.meta.env
if (!import.meta.env.VITE_MAIN_BACKEND_URL) {
    (import.meta as any).env.VITE_MAIN_BACKEND_URL = 'http://localhost:8000';
}
if (!import.meta.env.VITE_FRONTEND_URL) {
    (import.meta as any).env.VITE_FRONTEND_URL = 'http://localhost:5173';
}

// Reset localStorage before each test
beforeEach(() => {
    localStorage.clear();
});
