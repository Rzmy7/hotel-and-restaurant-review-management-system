

import { getApiBaseUrl } from '../config/api';

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const getFullUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    const baseUrl = getApiBaseUrl();
    
    // Normalize path by removing leading slash
    let cleanPath = url.startsWith('/') ? url.slice(1) : url;
    
    // Auto-prepend /api if it's missing (mandatory for production backend stability)
    if (!cleanPath.startsWith('api')) {
        cleanPath = `api/${cleanPath}`;
    }
    
    return `${baseUrl}/${cleanPath}`;
};

const isAuthLoginRequest = (requestUrl: string): boolean => {
    return /\/api\/auth\/login(?:\/2fa)?$/i.test(requestUrl);
};

const readErrorMessage = async (response: Response, fallback: string): Promise<string> => {
    try {
        const errorData = await response.json();
        return errorData?.detail || fallback;
    } catch {
        return fallback;
    }
};

const isPublicPage = (pathname: string): boolean => {
    if (pathname === '/' || pathname === '') return true;
    const publicPrefixes = [
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/terms',
        '/privacy',
        '/oauth-success'
    ];
    return publicPrefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

async function handleResponse(response: Response, requestUrl: string) {
    if (response.status === 401) {
        const backendMessage = await readErrorMessage(response, "Unauthorized");

        // Login endpoints should show credential-related errors, not session-expired messages.
        if (isAuthLoginRequest(requestUrl)) {
            throw new Error(backendMessage);
        }

        const isAuthMe = requestUrl.includes('/auth/me');

        if (!isAuthMe) {
            console.warn("Unauthorized! Clearing session and redirecting to login...");
        }
        localStorage.removeItem("token");
        localStorage.removeItem("authUser");
        // For protected endpoints, 401 means the current session is no longer valid.
        // Initial /auth/me check and public pages should not trigger a hard page reload redirect to login.
        if (!isPublicPage(window.location.pathname) && !isAuthMe) {
            window.location.href = "/login?expired=true";
        }
        throw new Error("Session expired. Please log in again.");
    }

    if (response.status === 403) {
        let errorMessage = "Access denied";
        try {
            const errorData = await response.json();
            errorMessage = errorData?.detail || errorMessage;
        } catch {
            // Ignore JSON parse errors
        }

        // Detect feature limit messages and show upgrade notification
        const lowerMsg = errorMessage.toLowerCase();
        if (lowerMsg.includes("limit reached") || lowerMsg.includes("upgrade your subscription")) {
            // Dispatch a custom event so the ToastContext can show a notification
            window.dispatchEvent(
                new CustomEvent("feature-limit-reached", {
                    detail: { message: errorMessage },
                })
            );
        }
        throw new Error(errorMessage);
    }

    if (!response.ok) {
        let errorMessage = `API Request failed: ${response.status}`;
        errorMessage = await readErrorMessage(response, errorMessage);
        throw new Error(errorMessage);
    }
    if (response.status === 204) {
        return {} as any; // ponytail: 204 has no body, return empty object to prevent JSON parsing crash
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        try {
            return await response.json();
        } catch {
            return {} as any; // ponytail: fallback for empty or invalid JSON bodies
        }
    }
    if (contentType && (contentType.indexOf("text/csv") !== -1 || contentType.indexOf("application/octet-stream") !== -1)) {
        return response.blob() as any;
    }
    return {};
}

const getHeaders = (customHeaders?: Record<string, string>, isFormData: boolean = false) => {
    const headers: Record<string, string> = {
        ...customHeaders
    };
    
    // ponytail: restrict localStorage fallback exclusively to unit test runs to prevent production XSS leakage
    const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis as any).process?.env?.NODE_ENV === 'test') || 
                      (import.meta.env?.MODE === 'test');
    if (isTestEnv) {
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    return headers;
};

export interface ApiRequestOptions {
    headers?: Record<string, string>;
    activity?: string;
    successMessage?: string;
    showSuccess?: boolean;
}

async function executeRequest<T>(
    method: string, 
    url: string, 
    body?: any, 
    options?: ApiRequestOptions, 
    queryParams?: Record<string, unknown>
): Promise<T> {
    const fullUrl = getFullUrl(url);
    const isFormData = body instanceof FormData;
    
    let queryString = '';
    if (queryParams) {
        const searchParams = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
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

    const activityId = Date.now().toString() + Math.random().toString();
    let timeoutId: number | undefined;
    let slowEventFired = false;

    if (options?.activity) {
        timeoutId = window.setTimeout(() => {
            slowEventFired = true;
            window.dispatchEvent(new CustomEvent('activity-start', {
                detail: { id: activityId, title: options.activity, progress: undefined, status: 'started' }
            }));
        }, 1000);
    }

    try {
        const response = await fetch(`${fullUrl}${queryString}`, {
            method,
            headers: getHeaders(options?.headers, isFormData),
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
            credentials: 'include'
        });
        const result = await handleResponse(response, fullUrl);
        
        if (timeoutId) clearTimeout(timeoutId);
        if (slowEventFired) {
            window.dispatchEvent(new CustomEvent('activity-success', {
                detail: { id: activityId, title: options?.successMessage, status: 'success', showSuccess: options?.showSuccess }
            }));
        }
        return result;
    } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        if (slowEventFired) {
            window.dispatchEvent(new CustomEvent('activity-error', {
                detail: { id: activityId, error: (error as Error).message, status: 'error' }
            }));
        }
        throw error;
    }
}

export const apiClient = {
    get<T>(url: string, params?: Record<string, unknown>, options?: ApiRequestOptions): Promise<T> {
        return executeRequest<T>('GET', url, undefined, options, params);
    },
    post<T>(url: string, body?: any, options?: ApiRequestOptions): Promise<T> {
        return executeRequest<T>('POST', url, body, options);
    },
    put<T>(url: string, body?: any, options?: ApiRequestOptions): Promise<T> {
        return executeRequest<T>('PUT', url, body, options);
    },
    patch<T>(url: string, body?: any, options?: ApiRequestOptions): Promise<T> {
        return executeRequest<T>('PATCH', url, body, options);
    },
    delete<T>(url: string, options?: ApiRequestOptions): Promise<T> {
        return executeRequest<T>('DELETE', url, undefined, options);
    }
};
