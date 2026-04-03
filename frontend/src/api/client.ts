

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const API_BASE_URL =
    import.meta.env.VITE_MAIN_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:8000';

const getApiBaseUrl = (): string => {
    const stored = localStorage.getItem('mainBackendUrl');
    return (stored || API_BASE_URL).replace(/\/$/, '');
};

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

async function handleResponse(response: Response) {
    if (response.status === 401) {
        console.warn("Unauthorized! Clearing session and redirecting to login...");
        localStorage.removeItem("token");
        localStorage.removeItem("authUser");
        // Clear other session-related keys if needed
        if (window.location.pathname !== "/login") {
            window.location.href = "/login?expired=true";
        }
        throw new Error("Session expired. Please log in again.");
    }

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

const getHeaders = (customHeaders?: Record<string, string>, isFormData: boolean = false) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        ...customHeaders
    };
    
    if (!isFormData) {
        headers['Content-Type'] = 'application/json';
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};

export const apiClient = {
    async get<T>(url: string, params?: Record<string, unknown>, customHeaders?: Record<string, string>): Promise<T> {
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

        const response = await fetch(`${fullUrl}${queryString}`, {
            method: 'GET',
            headers: getHeaders(customHeaders)
        });
        return handleResponse(response);
    },

    async post<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const isFormData = body instanceof FormData;
        console.log(`[API POST] ${fullUrl}`, isFormData ? '[FormData]' : body);
        
        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: getHeaders(customHeaders, isFormData),
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        });
        return handleResponse(response);
    },

    async put<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const isFormData = body instanceof FormData;
        console.log(`[API PUT] ${fullUrl}`, isFormData ? '[FormData]' : body);
        
        const response = await fetch(fullUrl, {
            method: 'PUT',
            headers: getHeaders(customHeaders, isFormData),
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        });
        return handleResponse(response);
    },

    async patch<T>(url: string, body?: any, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        const isFormData = body instanceof FormData;
        console.log(`[API PATCH] ${fullUrl}`, isFormData ? '[FormData]' : body);
        
        const response = await fetch(fullUrl, {
            method: 'PATCH',
            headers: getHeaders(customHeaders, isFormData),
            body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
        });
        return handleResponse(response);
    },

    async delete<T>(url: string, customHeaders?: Record<string, string>): Promise<T> {
        const fullUrl = getFullUrl(url);
        console.log(`[API DELETE] ${fullUrl}`);
        const response = await fetch(fullUrl, { 
            method: 'DELETE',
            headers: getHeaders(customHeaders)
        });
        return handleResponse(response);
    }
};
