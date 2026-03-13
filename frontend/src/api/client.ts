

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const DELAY_MS = 600;

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
        console.log(`[API GET] ${url}`, params);
        return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    },

    async post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
        console.log(`[API POST] ${url}`, body);
        return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    },

    async put<T>(url: string, body: any): Promise<T> {
        console.log(`[API PUT] ${url}`, body);
        return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    },

    async delete<T>(url: string): Promise<T> {
        console.log(`[API DELETE] ${url}`);
        return new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
};
