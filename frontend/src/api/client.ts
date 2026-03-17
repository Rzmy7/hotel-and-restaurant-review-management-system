

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

async function handleResponse(response: Response) {
    if (!response.ok) {
        let errorMessage = `API Request failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData?.detail || errorMessage;
        } catch {
            // Ignore JSON parse errors for non-JSON responses
        }
        throw new Error(errorMessage);
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
}

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API GET] ${fullUrl}`, params);
        
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

        const response = await fetch(`${fullUrl}${queryString}`);
        return handleResponse(response);
    },

    async post<T>(url: string, body?: Record<string, unknown>): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API POST] ${fullUrl}`, body);
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async put<T>(url: string, body: any): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API PUT] ${fullUrl}`, body);
        const response = await fetch(fullUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async patch<T>(url: string, body: any): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API PATCH] ${fullUrl}`, body);
        const response = await fetch(fullUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async delete<T>(url: string): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API DELETE] ${fullUrl}`);
        const response = await fetch(fullUrl, { method: 'DELETE' });
        return handleResponse(response);
    }
};
