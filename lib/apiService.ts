/**
 * apiService.ts
 *
 * A robust, highly reusable API Service Utility in TypeScript using the native browser `fetch` API.
 * This service connects to a FastAPI backend, providing automatic token injection,
 * in-memory token storage (per architecture rules), automatic token refresh
 * on 401 Unauthorized responses (with queueing logic), and standardized error handling.
 */
import { LoginResponse, UserProfile, RawMaterial, RawMaterialCreateInput, RawMaterialUpdateInput, PaginatedRawMaterials, MacrosUpdatePayload, Ingredient, IngredientCreateInput, IngredientUpdateInput, PaginatedIngredients, RawMaterialCategory, RawMaterialCategoryCreateInput, RawMaterialCategoryUpdateInput, PaginatedRawMaterialCategories } from "./types";

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

// ─── Token Management Helpers (Storage Backed) ───────────────────────────────
let memoryAccessToken: string | null = null;

export const setMemoryAccessToken = (token: string | null, rememberMe?: boolean) => {
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
        sessionStorage.removeItem("access_token");
      } else {
        sessionStorage.setItem("access_token", token);
        localStorage.removeItem("access_token");
      }
    } else {
      localStorage.removeItem("access_token");
      sessionStorage.removeItem("access_token");
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
    login: async (payload: { identifier: string; password: string; totp_code?: string }, rememberMe?: boolean): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      setMemoryAccessToken(response.access_token, rememberMe);
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
    },
    requestPasswordReset: async (email: string) => {
      return await api.post<any>("/auth/forgot-password", { identifier: email });
    },
    resetPassword: async (token: string, new_password: string) => {
      return await api.post<any>("/auth/reset-password", { token, new_password });
    }
  },
  
  users: {
    getMe: async () => {
      return await api.get<UserProfile>("/auth/me");
    },
    updateProfile: async (data: { profile_picture_id?: number; full_name?: string | null }) => {
      return await api.patch<UserProfile>("/auth/me", data);
    },
  },

  documents: {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<{ id: number; filename: string; content_type: string; size_bytes: number; created_at: string }>("/documents/upload", formData);
    },
  },

  rawMaterials: {
    getRawMaterials: async (page: number, size: number, search?: string): Promise<PaginatedRawMaterials> => {
      let query = `?page=${page}&size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      return await api.get<PaginatedRawMaterials>(`/raw-materials/${query}`);
    },
    getRawMaterial: async (ulid: string): Promise<RawMaterial> => {
      return await api.get<RawMaterial>(`/raw-materials/${ulid}`);
    },
    createRawMaterial: async (data: RawMaterialCreateInput): Promise<RawMaterial> => {
      return await api.post<RawMaterial>("/raw-materials/", data);
    },
    updateRawMaterial: async (ulid: string, data: RawMaterialUpdateInput): Promise<RawMaterial> => {
      return await api.patch<RawMaterial>(`/raw-materials/${ulid}`, data);
    },
    updateMacros: async (ulid: string, data: MacrosUpdatePayload): Promise<RawMaterial> => {
      return await api.patch<RawMaterial>(`/raw-materials/${ulid}/macros`, data);
    },
    deleteRawMaterial: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/raw-materials/${ulid}`);
    },

  },

  rawMaterialCategories: {
    getCategories: async (page: number, size: number, search?: string): Promise<PaginatedRawMaterialCategories> => {
      let query = `?page=${page}&size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      return await api.get<PaginatedRawMaterialCategories>(`/raw-material-categories/${query}`);
    },
    getCategory: async (ulid: string): Promise<RawMaterialCategory> => {
      return await api.get<RawMaterialCategory>(`/raw-material-categories/${ulid}`);
    },
    createCategory: async (data: RawMaterialCategoryCreateInput): Promise<RawMaterialCategory> => {
      return await api.post<RawMaterialCategory>("/raw-material-categories/", data);
    },
    updateCategory: async (ulid: string, data: RawMaterialCategoryUpdateInput): Promise<RawMaterialCategory> => {
      return await api.patch<RawMaterialCategory>(`/raw-material-categories/${ulid}`, data);
    },
    deleteCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/raw-material-categories/${ulid}`);
    },
  },

  ingredients: {
    getIngredients: async (page: number, size: number, search?: string): Promise<PaginatedIngredients> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      return await api.get<PaginatedIngredients>(`/ingredients/${query}`);
    },
    getIngredient: async (ulid: string): Promise<Ingredient> => {
      return await api.get<Ingredient>(`/ingredients/${ulid}`);
    },
    createIngredient: async (data: IngredientCreateInput): Promise<Ingredient> => {
      return await api.post<Ingredient>("/ingredients/", data);
    },
    updateIngredient: async (ulid: string, data: IngredientUpdateInput): Promise<Ingredient> => {
      return await api.put<Ingredient>(`/ingredients/${ulid}`, data);
    },
    deleteIngredient: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/ingredients/${ulid}`);
    },
  },

  settings: {
    getSystemSettings: async (): Promise<{ R2_BASE_URL: string }> => {
      return await api.get<{ R2_BASE_URL: string }>("/settings");
    },
    updateSystemSettings: async (payload: Record<string, string>): Promise<Record<string, string>> => {
      return await api.put<Record<string, string>>("/settings", payload);
    },
  },
};
