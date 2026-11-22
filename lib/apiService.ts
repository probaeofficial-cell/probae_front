/**
 * apiService.ts
 *
 * A robust, highly reusable API Service Utility in TypeScript using the native browser `fetch` API.
 * This service connects to a FastAPI backend, providing automatic token injection,
 * in-memory token storage (per architecture rules), automatic token refresh
 * on 401 Unauthorized responses (with queueing logic), and standardized error handling.
 */
import { createOrdersApi } from "./api/orders";
import { createExpensesApi } from "./api/sections/expenses";
import { createDashboardApi } from "./api/sections/dashboard";
import { createGlobalTransactionsApi } from "./api/sections/globalTransactions";
import { createLogisticsApi } from "./api/sections/logistics";
import { createKdsApi } from "./api/sections/kds";
import { createAuthApi } from "./api/sections/auth";
import { createUsersApi } from "./api/sections/users";
import { createRbacApi } from "./api/sections/rbac";
import { createAdminUsersApi } from "./api/sections/adminUsers";
import { createDocumentsApi } from "./api/sections/documents";
import { createRawMaterialsApi } from "./api/sections/rawMaterials";
import { createRawMaterialCategoriesApi } from "./api/sections/rawMaterialCategories";
import { createIngredientsApi } from "./api/sections/ingredients";
import { createMessageTemplatesApi } from "./api/sections/messageTemplates";
import { createSettingsApi } from "./api/sections/settings";
import { createBowlCategoriesApi } from "./api/sections/bowlCategories";
import { createMealCategoriesApi } from "./api/sections/mealCategories";
import { createVendorsApi } from "./api/sections/vendors";
import { createPackagingComponentsApi } from "./api/sections/packagingComponents";
import { createPackagingApi } from "./api/sections/packaging";
import { createTransactionsApi } from "./api/sections/transactions";
import { createCustomersApi } from "./api/sections/customers";
import { createPlanTiersApi } from "./api/sections/planTiers";
import { createMenuBlueprintsApi } from "./api/sections/menuBlueprints";
import { createNotificationsApi } from "./api/sections/notifications";
import { createBowlsApi } from "./api/sections/bowls";
import { createPublicApi } from "./api/sections/public";
import { createEnquiriesApi } from "./api/sections/enquiries";
import { createBadgesApi } from "./api/sections/badges";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Read the backend base URL from environment variables.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.probae.in/api/v1";

// ─── Types & Interfaces ──────────────────────────────────────────────────────
export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: any; // Allow passing objects to be automatically serialized to JSON
  responseType?: "json" | "blob";
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

// ─── Token Management Helpers (Storage Backed) ───────────────────────────────
let memoryAccessToken: string | null = null;

export const setMemoryAccessToken = (token: string | null, rememberMe?: boolean, refreshToken?: string) => {
  memoryAccessToken = token;
  if (typeof window !== "undefined") {
    if (token) {
      // Determine if we should remember based on parameter if provided,
      // or inspect existing storage if not specified (e.g. during a refresh)
      let shouldRemember = rememberMe;
      if (shouldRemember === undefined) {
        shouldRemember = localStorage.getItem("access_token") !== null;
      }

      if (shouldRemember) {
        localStorage.setItem("access_token", token);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("refresh_token");
      } else {
        sessionStorage.setItem("access_token", token);
        if (refreshToken) sessionStorage.setItem("refresh_token", refreshToken);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }
    } else {
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("refresh_token");
    }
  }
};

export const getAccessToken = (): string | null => {
  if (memoryAccessToken) {
    return memoryAccessToken;
  }
  if (typeof window !== "undefined") {
    const localToken = localStorage.getItem("access_token");
    if (localToken) {
      memoryAccessToken = localToken;
      return localToken;
    }
    const sessionToken = sessionStorage.getItem("access_token");
    if (sessionToken) {
      memoryAccessToken = sessionToken;
      return sessionToken;
    }
  }
  return null;
};

const clearTokens = () => {
  memoryAccessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    sessionStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    sessionStorage.removeItem("refresh_token");
  }
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
const parseError = async (response: Response, endpoint?: string): Promise<never> => {
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
      } else if (typeof errorData.detail === "object" && errorData.detail !== null) {
        const obj = errorData.detail as any;
        if (obj.message) {
          errorMessage = obj.message;
        }
      }
    }
  } catch (e) {
    // If response is not JSON, fallback to the standard HTTP status message
  }

  // Intercept 401 status codes and redirect to login page if on admin or delivery route (skip for customer pages)
  if (response.status === 401 && !endpoint?.startsWith("/auth/login")) {
    clearTokens();
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      } else if (pathname.startsWith("/delivery") && !pathname.startsWith("/delivery/login")) {
        window.location.href = "/delivery/login";
      }
      // Public customer paths (/onboarding, /menu, /plans, /) are never redirected!
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
    cache: "no-store",
    ...options,
    headers,
    body,
    credentials: "include",
  };

  try {
    let response = await fetch(url, config);

    // ─── Interceptor: Handle 401 Unauthorized ────────────────────────────────
    const isAuthEndpoint = endpoint.startsWith("/auth/login") || endpoint.startsWith("/auth/refresh");
    if (response.status === 401 && !isAuthEndpoint) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // The backend handles the refresh_token via an HttpOnly cookie.
          // By using credentials: "include", the cookie is automatically sent.
          // As a fallback (if cookies are blocked cross-origin or by Safari ITP), we also send it in the body.
          const storedRefreshToken = localStorage.getItem("refresh_token") || sessionStorage.getItem("refresh_token");
          
          const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: storedRefreshToken ? JSON.stringify({ refresh_token: storedRefreshToken }) : undefined,
            credentials: "include",
          });

          if (!refreshResponse.ok) {
            throw new Error("Refresh token expired or invalid");
          }

          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData.access_token; 
          const newRefreshToken = refreshData.refresh_token;
          
          setMemoryAccessToken(newAccessToken, undefined, newRefreshToken);
          isRefreshing = false;
          onTokenRefreshed(newAccessToken); 
        } catch (refreshError) {
          isRefreshing = false;
          clearTokens();
          onTokenRefreshed(null); 
          if (typeof window !== "undefined") {
            const pathname = window.location.pathname;
            if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
              window.location.href = "/admin/login";
            } else if (pathname.startsWith("/delivery") && !pathname.startsWith("/delivery/login")) {
              window.location.href = "/delivery/login";
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
      return parseError(response, endpoint);
    }

    if (response.status === 204) {
      return null as any;
    }

    if (options.responseType === "blob") {
      return response.blob() as any;
    }

    return response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error?.name === "AbortError") {
      throw new ApiError("Request was aborted", 499);
    }

    // Gracefully handle network disconnects, CORS preflight blocks, or server down
    const isNetworkFailure =
      error?.name === "TypeError" ||
      error?.message?.includes("fetch") ||
      error?.message?.includes("NetworkError") ||
      error?.message?.includes("Failed to fetch") ||
      error?.message?.includes("Load failed");

    if (isNetworkFailure) {
      console.warn(`[Network Warning] Could not reach backend at ${url}:`, error?.message || error);
      throw new ApiError(
        "Unable to connect to the backend server. Please check your network connection and ensure the API server is running.",
        0,
        { originalError: error?.message || String(error), url }
      );
    }

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

  delete: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),

  del: <T>(endpoint: string, options?: Omit<FetchOptions, "method" | "body">) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};

// ─── Application API Endpoints ───────────────────────────────────────────────
export const endpoints = {
  expenses: createExpensesApi(api),
  dashboard: createDashboardApi(api),
  globalTransactions: createGlobalTransactionsApi(api),
  logistics: createLogisticsApi(api),
  kds: createKdsApi(api),
  orders: createOrdersApi(api),
  auth: createAuthApi(api, setMemoryAccessToken, clearTokens),
  users: createUsersApi(api),
  rbac: createRbacApi(api),
  adminUsers: createAdminUsersApi(api),
  documents: createDocumentsApi(api),
  rawMaterials: createRawMaterialsApi(api),
  rawMaterialCategories: createRawMaterialCategoriesApi(api),
  ingredients: createIngredientsApi(api),
  messageTemplates: createMessageTemplatesApi(api),
  settings: createSettingsApi(api),
  bowlCategories: createBowlCategoriesApi(api),
  mealCategories: createMealCategoriesApi(api),
  vendors: createVendorsApi(api),
  packagingComponents: createPackagingComponentsApi(api),
  packaging: createPackagingApi(api),
  transactions: createTransactionsApi(api),
  customers: createCustomersApi(api),
  planTiers: createPlanTiersApi(api),
  menuBlueprints: createMenuBlueprintsApi(api),
  notifications: createNotificationsApi(api),
  bowls: createBowlsApi(api),
  public: createPublicApi(api),
  enquiries: createEnquiriesApi(api),
  badges: createBadgesApi(api),
};

// Export dedicated customer-side API client & endpoints
export { customerApi, customerEndpoints } from "./customerApiService";
