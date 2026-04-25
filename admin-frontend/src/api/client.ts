/**
 * Centralized API Client for admin-frontend
 */
import { getApiBaseUrl } from '../config/api';

const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const baseUrl = getApiBaseUrl();
    
    // Normalize path by removing leading slash
    let cleanPath = url.startsWith('/') ? url.slice(1) : url;
    
    // Auto-prepend /api if it's missing
    const isSpecialRoute = cleanPath.startsWith('api') || 
                          cleanPath.startsWith('auth') || 
                          cleanPath.startsWith('public') || 
                          cleanPath.startsWith('oauth');
                          
    if (!isSpecialRoute) {
        cleanPath = `api/${cleanPath}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
};

async function handleResponse(response: Response) {
    if (response.status === 401) {
        console.warn("Unauthorized! Redirecting to login...");
        localStorage.removeItem("token");
        const frontendUrl = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        window.location.href = `${frontendUrl}/login?expired=true`;
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
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...customHeaders
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>, customHeaders?: Record<string, string>): Promise<T> {
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
            headers: getHeaders(customHeaders)
        });
        return handleResponse(response);
    },

    async post<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async patch<T>(url: string, body: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'PATCH',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async put<T>(url: string, body: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, {
            method: 'PUT',
            headers: getHeaders(customHeaders),
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse(response);
    },

    async delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const response = await fetch(fullUrl, { 
            method: 'DELETE',
            headers: getHeaders(customHeaders)
        });
        return handleResponse(response);
    }
};
