import { getApiBaseUrl } from "../config/api";
import { logger } from "../utils/logger";

/**
 * A simulated API Client that mimics real-world network latency and Promise-based responses.
 * In a real application, this would wrap fetch() or axios().
 */

const getFullUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  const baseUrl = getApiBaseUrl();

  // Normalize path by removing leading slash
  let cleanPath = url.startsWith("/") ? url.slice(1) : url;

  // Auto-prepend /api if it's missing (mandatory for production backend stability)
  if (!cleanPath.startsWith("api")) {
    cleanPath = `api/${cleanPath}`;
  }

  return `${baseUrl}/${cleanPath}`;
};

const isAuthLoginRequest = (requestUrl: string): boolean => {
  return /\/api\/auth\/login(?:\/2fa)?$/i.test(requestUrl);
};

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  try {
    const errorData = await response.json();
    return errorData?.detail || fallback;
  } catch {
    return fallback;
  }
};

async function handleResponse(response: Response, requestUrl: string) {
  if (response.status === 401) {
    const backendMessage = await readErrorMessage(response, "Unauthorized");

    // Login endpoints should show credential-related errors, not session-expired messages.
    if (isAuthLoginRequest(requestUrl)) {
      throw new Error(backendMessage);
    }
 
    logger.warn("Unauthorized! Clearing session and redirecting to login...");
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
    // For protected endpoints, 401 means the current session is no longer valid.
    if (window.location.pathname !== "/login") {
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
    if (
      lowerMsg.includes("limit reached") ||
      lowerMsg.includes("upgrade your subscription")
    ) {
      // Dispatch a custom event so the ToastContext can show a notification
      window.dispatchEvent(
        new CustomEvent("feature-limit-reached", {
          detail: { message: errorMessage },
        }),
      );
    }
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    let errorMessage = `API Request failed: ${response.status}`;
    errorMessage = await readErrorMessage(response, errorMessage);
    throw new Error(errorMessage);
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  }
  if (
    contentType &&
    (contentType.indexOf("text/csv") !== -1 ||
      contentType.indexOf("application/octet-stream") !== -1)
  ) {
    return response.blob() as any;
  }
  return {};
}

const getHeaders = (
  customHeaders?: Record<string, string>,
  isFormData: boolean = false,
) => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const apiClient = {
  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = getFullUrl(url);
    logger.api("GET", fullUrl, params);

    let queryString = "";
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
      queryString = searchParams.toString()
        ? `?${searchParams.toString()}`
        : "";
    }

    const response = await fetch(`${fullUrl}${queryString}`, {
      method: "GET",
      headers: getHeaders(customHeaders),
    });
    return handleResponse(response, fullUrl);
  },

  async post<T>(
    url: string,
    body?: any,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = getFullUrl(url);
    const isFormData = body instanceof FormData;
    logger.api("POST", fullUrl, isFormData ? "[FormData]" : body);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: getHeaders(customHeaders, isFormData),
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response, fullUrl);
  },

  async put<T>(
    url: string,
    body?: any,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = getFullUrl(url);
    const isFormData = body instanceof FormData;
    logger.api("PUT", fullUrl, isFormData ? "[FormData]" : body);

    const response = await fetch(fullUrl, {
      method: "PUT",
      headers: getHeaders(customHeaders, isFormData),
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response, fullUrl);
  },

  async patch<T>(
    url: string,
    body?: any,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = getFullUrl(url);
    const isFormData = body instanceof FormData;
    logger.api("PATCH", fullUrl, isFormData ? "[FormData]" : body);

    const response = await fetch(fullUrl, {
      method: "PATCH",
      headers: getHeaders(customHeaders, isFormData),
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(response, fullUrl);
  },

  async delete<T>(
    url: string,
    customHeaders?: Record<string, string>,
  ): Promise<T> {
    const fullUrl = getFullUrl(url);
    logger.api("DELETE", fullUrl);
    const response = await fetch(fullUrl, {
      method: "DELETE",
      headers: getHeaders(customHeaders),
    });
    return handleResponse(response, fullUrl);
  },
};
