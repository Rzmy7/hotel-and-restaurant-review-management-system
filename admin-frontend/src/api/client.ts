/**
 * Centralized API Client for admin-frontend
 */
import { getApiBaseUrl } from '../config/api';
import { getFrontendLoginUrl } from '../config/frontend';

const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const baseUrl = getApiBaseUrl();
    
    // Normalize path by removing leading slash
    let cleanPath = url.startsWith('/') ? url.slice(1) : url;
    
    // Auto-prepend /api if it's missing (mandatory for backend stability)
    if (!cleanPath.startsWith('api')) {
        cleanPath = `api/${cleanPath}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
};

async function handleResponse(response: Response) {
    if (response.status === 401) {
        console.warn("Unauthorized! Redirecting to login...");
        localStorage.removeItem("token");
        window.location.href = getFrontendLoginUrl('expired=true');
        throw new Error("Session expired.");
    }

    if (!response.ok) {
        let errorMessage = `API Request failed: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData?.detail || errorMessage;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
    }
    
    if (response.status === 204) return {};
    
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return response.json();
    }
    return {};
}

const getHeaders = (customHeaders?: Record<string, string>) => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders
    };
    
    // ponytail: restrict localStorage fallback exclusively to unit test runs to prevent production XSS leakage
    const isTestEnv = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') || 
                      (import.meta.env?.MODE === 'test');
    if (isTestEnv) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    return headers;
};

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>, customHeaders?: Record<string, string>, signal?: AbortSignal): Promise<T> {
        const fullUrl = getFullUrl(url);
        let queryString = '';
        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(v => searchParams.append(key, String(v)));
                    } else {
                        searchParams.append(key, String(value));
                    }
                }
            });
            queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
        }
        const response = await fetch(`${fullUrl}${queryString}`, {
            method: 'GET',
            headers: getHeaders(customHeaders),
            credentials: 'include',
            signal
        });
        return handleResponse(response);
    },

    async post<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
        });
        return handleResponse(response);
    },

    async patch<T>(url: string, body: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'PATCH',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
        });
        return handleResponse(response);
    },

    async put<T>(url: string, body: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'PUT',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'include',
        });
        return handleResponse(response);
    },

    async delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, { 
            method: 'DELETE',
            headers: getHeaders(customHeaders),
            credentials: 'include',
        });
        return handleResponse(response);
    }
};
