/**
 * apiService.ts
 *
 * A robust, highly reusable API Service Utility in TypeScript using the native browser `fetch` API.
 * This service connects to a FastAPI backend, providing automatic token injection,
 * cascade token retrieval (SessionStorage -> LocalStorage), automatic token refresh
 * on 401 Unauthorized responses (with queueing logic), and standardized error handling.
 */
import { LoginResponse, UserProfile } from "./types";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Read the backend base URL from environment variables.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Types & Interfaces ──────────────────────────────────────────────────────
export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: any; // Allow passing objects to be automatically serialized to JSON
}

export interface FastAPIError {
  // FastAPI typically returns errors in a `detail` field which can be a string or an array of objects
  detail?: string | Array<{ msg: string; type: string; loc: string[] }>;
}

// ─── Token Management Helpers ────────────────────────────────────────────────
/**
 * Cascade Token Retrieval Logic:
 * Checks sessionStorage first. If not found, falls back to localStorage.
 * This supports both "Remember Me" (localStorage) and single-session (sessionStorage) logins.
 */
const getAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
};

const getRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("refreshToken") || localStorage.getItem("refreshToken");
};

/**
 * Saves the new access token to the same storage medium where the refresh token resides.
 */
const saveAccessToken = (token: string) => {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem("refreshToken")) {
    sessionStorage.setItem("accessToken", token);
  } else if (localStorage.getItem("refreshToken")) {
    localStorage.setItem("accessToken", token);
  }
};

/**
 * Clears all authentication tokens from both storage mechanisms upon a hard logout or refresh failure.
 */
const clearTokens = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("refreshToken");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// ─── Token Refresh Queue Logic ───────────────────────────────────────────────
// When an access token expires, multiple parallel requests might fail with 401 simultaneously.
// We use a queue to pause those requests, fetch a new token ONCE, and then retry them all.

let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

/**
 * Adds a pending request to the queue to be executed once the token is refreshed.
 */
const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

/**
 * Processes the queue, resolving all pending requests with the new token or failing them if null.
 */
const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = []; // clear the queue
};

// ─── Error Handling ──────────────────────────────────────────────────────────
/**
 * Parses FastAPI HTTPExceptions and normalizes the error message.
 */
const parseError = async (response: Response): Promise<never> => {
  let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
  try {
    const errorData = (await response.json()) as FastAPIError;
    if (errorData.detail) {
      if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
        // FastAPI pydantic validation errors format
        errorMessage = errorData.detail.map((err) => err.msg).join(", ");
      }
    }
  } catch (e) {
    // If response is not JSON, fallback to the standard HTTP status message
  }
  throw new Error(errorMessage);
};

// ─── Central Fetcher ─────────────────────────────────────────────────────────
/**
 * The core fetch client that handles URL concatenation, header injection, request body serialization,
 * and interception of 401s for automatic token rotation.
 */
async function fetchClient<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Prepare headers
  const headers = new Headers(options.headers || {});
  
  // Automatically set Content-Type to JSON if not passing FormData
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Access Token using cascade logic
  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Prepare body: stringify object payloads
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    body = JSON.stringify(body);
  }

  const config: RequestInit = {
    ...options,
    headers,
    body,
  };

  try {
    let response = await fetch(url, config);

    // ─── Interceptor: Handle 401 Unauthorized ────────────────────────────────
    if (response.status === 401) {
      const refreshToken = getRefreshToken();
      
      if (!refreshToken) {
        // No refresh token available; force clear and redirect
        clearTokens();
        if (typeof window !== "undefined") window.location.href = "/admin/login";
        throw new Error("Session expired. Please log in again.");
      }

      // If a refresh is not already in progress, lock and initiate it
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // Attempt to fetch a new access token
          // Note: Adjust the refresh endpoint and payload to match your FastAPI backend
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${refreshToken}`, // Or sent in the body depending on your spec
            },
          });

          if (!refreshResponse.ok) {
            throw new Error("Refresh token expired or invalid");
          }

          const refreshData = await refreshResponse.json();
          // Adjust 'access_token' if your FastAPI returns a different key
          const newAccessToken = refreshData.access_token; 
          
          saveAccessToken(newAccessToken);
          isRefreshing = false;
          onTokenRefreshed(newAccessToken); // Flush queue with success
        } catch (refreshError) {
          isRefreshing = false;
          clearTokens();
          onTokenRefreshed(null); // Flush queue with failure
          if (typeof window !== "undefined") window.location.href = "/admin/login";
          throw new Error("Session expired. Please log in again.");
        }
      }

      // Pause this request and wait for the refresh token queue to resolve
      const retryOriginalRequest = new Promise<Response>((resolve, reject) => {
        subscribeTokenRefresh((newToken: string | null) => {
          if (newToken) {
            // Update the authorization header with the new token
            headers.set("Authorization", `Bearer ${newToken}`);
            // Seamlessly retry the original request
            resolve(fetch(url, { ...config, headers }));
          } else {
            // Token refresh failed during queueing
            reject(new Error("Authentication failed. Please log in again."));
          }
        });
      });

      response = await retryOriginalRequest;
    }

    // ─── Handle other HTTP Errors (4xx, 5xx) ─────────────────────────────────
    if (!response.ok) {
      return parseError(response);
    }

    // ─── Parse JSON Response ─────────────────────────────────────────────────
    // Handle 204 No Content gracefully
    if (response.status === 204) {
      return null as any;
    }

    return response.json();
  } catch (error) {
    // Re-throw the error to be caught by the calling frontend component
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
// You can define all your API calls in this single file for convenience.

export const endpoints = {
  auth: {
    login: async (email: string, password: string, rememberMe: boolean = false): Promise<LoginResponse> => {
      const payload = { email, password };
      const response = await api.post<LoginResponse>("/auth/login", payload);

      if (typeof window !== "undefined") {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem("accessToken", response.access_token);
        if (response.refresh_token) {
          storage.setItem("refreshToken", response.refresh_token);
        }
      }
      return response;
    },
    logout: () => {
      clearTokens();
      if (typeof window !== "undefined") window.location.href = "/admin/login";
    }
  },
  
  users: {
    /**
     * Fetches the current authenticated user details.
     * The `Authorization: Bearer <token>` header is automatically injected by `api.get`.
     */
    getMe: async () => {
      return await api.get<UserProfile>("/users/me");
    },
    
    /**
     * Example of fetching a specific user by ID
     */
    getById: async (id: string) => {
      return await api.get<UserProfile>(`/users/${id}`);
    }
  },
  
  // Add other domains here (e.g., tasks, posts, products)
  // products: {
  //   getAll: async () => await api.get<Product[]>("/products"),
  //   create: async (data: any) => await api.post<Product>("/products", data)
  // }
};
