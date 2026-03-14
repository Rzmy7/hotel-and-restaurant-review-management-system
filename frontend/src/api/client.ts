

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const DELAY_MS = 600;

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
        console.log(`[API GET] ${url}`, params);
        
        let queryString = '';
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
        }

        const response = await fetch(`${url}${queryString}`);
        if (!response.ok) throw new Error(`API GET failed: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        } else {
            throw new Error(`API GET returning non-JSON response`);
        }
    },

    async post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
        console.log(`[API POST] ${url}`, body);
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`API POST failed: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return {} as T;
    },

    async put<T>(url: string, body: any): Promise<T> {
        console.log(`[API PUT] ${url}`, body);
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) throw new Error(`API PUT failed: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return {} as T;
    },

    async delete<T>(url: string): Promise<T> {
        console.log(`[API DELETE] ${url}`);
        const response = await fetch(url, { method: 'DELETE' });
        if (!response.ok) throw new Error(`API DELETE failed: ${response.status}`);
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return {} as T;
    }
};
