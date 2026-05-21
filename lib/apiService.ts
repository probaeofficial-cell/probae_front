/**
 * apiService.ts
 *
 * A robust, highly reusable API Service Utility in TypeScript using the native browser `fetch` API.
 * This service connects to a FastAPI backend, providing automatic token injection,
 * in-memory token storage (per architecture rules), automatic token refresh
 * on 401 Unauthorized responses (with queueing logic), and standardized error handling.
 */
import { LoginResponse, UserProfile } from "./types";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Read the backend base URL from environment variables.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

// ─── Types & Interfaces ──────────────────────────────────────────────────────
export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: any; // Allow passing objects to be automatically serialized to JSON
}

export interface FastAPIError {
  detail?: string | Array<{ msg: string; type: string; loc: string[] }>;
}

export class ApiError extends Error {
  public status: number;
  public detail?: any;
  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// ─── Token Management Helpers (In-Memory Only) ───────────────────────────────
let memoryAccessToken: string | null = null;

export const setMemoryAccessToken = (token: string | null) => {
  memoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return memoryAccessToken;
};

const clearTokens = () => {
  memoryAccessToken = null;
};

// ─── Token Refresh Queue Logic ───────────────────────────────────────────────
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = []; // clear the queue
};

// ─── Error Handling ──────────────────────────────────────────────────────────
const parseError = async (response: Response): Promise<never> => {
  let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
  let detail = null;
  try {
    const errorData = (await response.json()) as FastAPIError;
    detail = errorData.detail;
    if (errorData.detail) {
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
        errorMessage = errorData.detail.map((err) => err.msg).join(", ");
      }
    }
  } catch (e) {
    // If response is not JSON, fallback to the standard HTTP status message
  }

  // Intercept 401/403 status codes and redirect to login page if not already there
  if (response.status === 401 || response.status === 403) {
    clearTokens();
    if (typeof window !== "undefined") {
      if (!window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
  }

  throw new ApiError(errorMessage, response.status, detail);
};

// ─── Central Fetcher ─────────────────────────────────────────────────────────
async function fetchClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Prepare headers
  const headers = new Headers(options.headers || {});
  
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Access Token
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Prepare body: stringify object payloads
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    body = JSON.stringify(body);
  }

  // Ensure credentials are included to send and receive HttpOnly cookies (e.g. refresh_token)
  const config: RequestInit = {
    ...options,
    headers,
    body,
    credentials: "include",
  };

  try {
    let response = await fetch(url, config);

    // ─── Interceptor: Handle 401 Unauthorized ────────────────────────────────
    if (response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // The backend handles the refresh_token via an HttpOnly cookie.
          // By using credentials: "include", the cookie is automatically sent.
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (!refreshResponse.ok) {
            throw new Error("Refresh token expired or invalid");
          }

          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.access_token; 
          
          setMemoryAccessToken(newAccessToken);
          isRefreshing = false;
          onTokenRefreshed(newAccessToken); 
        } catch (refreshError) {
          isRefreshing = false;
          clearTokens();
          onTokenRefreshed(null); 
          if (typeof window !== "undefined") {
            if (!window.location.pathname.startsWith("/admin/login")) {
              window.location.href = "/admin/login";
            }
          }
          throw new ApiError("Session expired. Please log in again.", 401);
        }
      }

      const retryOriginalRequest = new Promise<Response>((resolve, reject) => {
        subscribeTokenRefresh((newToken: string | null) => {
          if (newToken) {
            headers.set("Authorization", `Bearer ${newToken}`);
            resolve(fetch(url, { ...config, headers }));
          } else {
            reject(new ApiError("Authentication failed. Please log in again.", 401));
          }
        });
      });

      response = await retryOriginalRequest;
    }

    if (!response.ok) {
      return parseError(response);
    }

    if (response.status === 204) {
      return null as any;
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

// ─── Clean HTTP Method Wrappers ──────────────────────────────────────────────
export const api = {
  get: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "POST", body: data }),

  put: <T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "PUT", body: data }),

  patch: <T>(endpoint: string, data?: any, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "PATCH", body: data }),

  del: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};

// ─── Application API Endpoints ───────────────────────────────────────────────
export const endpoints = {
  auth: {
    login: async (payload: { identifier: string; password: string; totp_code?: string }): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      setMemoryAccessToken(response.access_token);
      return response;
    },
    logout: async () => {
      try {
        await api.post("/auth/logout");
      } catch (e) {
        console.error("Failed to call logout API", e);
      } finally {
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/admin/login";
      }
    },
    setup2FA: async () => {
      return await api.post<{ secret: string; qr_code_url: string }>("/auth/setup-2fa");
    },
    verify2FA: async (totp_code: string) => {
      return await api.post<{ success: boolean }>("/auth/verify-2fa", { code: totp_code });
    }
  },
  
  users: {
    getMe: async () => {
      return await api.get<UserProfile>("/auth/me");
    },
  },
};
