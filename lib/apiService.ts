/**
 * apiService.ts
 *
 * A robust, highly reusable API Service Utility in TypeScript using the native browser `fetch` API.
 * This service connects to a FastAPI backend, providing automatic token injection,
 * in-memory token storage (per architecture rules), automatic token refresh
 * on 401 Unauthorized responses (with queueing logic), and standardized error handling.
 */
import { LoginResponse, UserProfile, RawMaterial, RawMaterialCreateInput, RawMaterialUpdateInput, PaginatedRawMaterials, MacrosUpdatePayload, Ingredient, IngredientCreateInput, IngredientUpdateInput, PaginatedIngredients, RawMaterialCategory, RawMaterialCategoryCreateInput, RawMaterialCategoryUpdateInput, PaginatedRawMaterialCategories, StockLog, BowlCategory, BowlCategoryCreateInput, BowlCategoryUpdateInput, PaginatedBowlCategories, PaginatedPackagingComponents, PackagingComponent, PackagingComponentCreateInput, PackagingComponentUpdateInput, PaginatedPackaging, Packaging, PackagingCreateInput, PackagingUpdateInput, PaginatedBowls, Bowl, BowlCreateInput, BowlUpdateInput, Vendor, VendorCreateInput, VendorUpdateInput, PaginatedVendors, MealCategory, MealCategoryCreateInput, MealCategoryUpdateInput, PaginatedMealCategories } from "./types";

// ─── Base URL ────────────────────────────────────────────────────────────────
// Read the backend base URL from environment variables.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.probae.in/api/v1";

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

  // Intercept 401 status codes and redirect to login page if not already there
  if (response.status === 401) {
    clearTokens();
    if (typeof window !== "undefined") {
      const isDeliveryPath = window.location.pathname.startsWith("/delivery");
      const loginUrl = isDeliveryPath ? "/delivery/login" : "/admin/login";
      if (!window.location.pathname.startsWith(loginUrl)) {
        window.location.href = loginUrl;
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
  console.log(token);
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
  expenses: {
    listCategories: (activeOnly: boolean = false, page?: number, limit?: number, search?: string) => {
      const q = new URLSearchParams();
      q.append('active_only', activeOnly.toString());
      if (page) q.append('page', page.toString());
      if (limit) q.append('limit', limit.toString());
      if (search) q.append('search', search);
      return api.get(`/expenses/categories?${q.toString()}`);
    },
    createCategory: (payload: any) => api.post('/expenses/categories', payload),
    updateCategory: (ulid: string, payload: any) => api.put(`/expenses/categories/${ulid}`, payload),
    list: (params: { page?: number, limit?: number, month?: string, category_ulid?: string, search?: string }) => {
      const q = new URLSearchParams();
      if (params.page) q.append('page', params.page.toString());
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.month) q.append('month', params.month);
      if (params.category_ulid) q.append('category_ulid', params.category_ulid);
      if (params.search) q.append('search', params.search);
      return api.get(`/expenses?${q.toString()}`);
    },
    create: (payload: any) => api.post('/expenses', payload),
    del: (ulid: string) => api.del(`/expenses/${ulid}`)
  },
  dashboard: {
    financials: (params: { start_date: string, end_date: string }) => api.get(`/dashboard/financials?start_date=${params.start_date}&end_date=${params.end_date}`)
  },
  globalTransactions: {
    list: (params: { page?: number, limit?: number, transaction_type?: string, date_from?: string, date_to?: string }) => {
      const q = new URLSearchParams();
      if (params.page) q.append('page', params.page.toString());
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.transaction_type) q.append('transaction_type', params.transaction_type);
      if (params.date_from) q.append('date_from', params.date_from);
      if (params.date_to) q.append('date_to', params.date_to);
      return api.get(`/transactions?${q.toString()}`);
    },
    dailySummary: (date?: string) => api.get('/transactions/daily-summary' + (date ? `?target_date=${date}` : ''))
  },

  logistics: {
    getZones: async (activeOnly: boolean = true) => {
      return api.get(`/logistics/zones?active_only=${activeOnly}`);
    },
    createZone: async (data: any) => {
      return api.post(`/logistics/zones`, data);
    },
    updateZone: async (ulid: string, data: any) => {
      return api.patch(`/logistics/zones/${ulid}`, data);
    },
    getDrivers: async (activeOnly: boolean = true) => {
      return api.get(`/logistics/drivers?active_only=${activeOnly}`);
    },
    createDriver: async (data: any) => {
      return api.post(`/logistics/drivers`, data);
    },
    updateDriver: async (ulid: string, data: any) => {
      return api.patch(`/logistics/drivers/${ulid}`, data);
    },
  },
  kds: {
    getPrepList: async (date: string, mealSlot?: string) => {
      let url = `/kds/prep-list?target_date=${date}`;
      if (mealSlot && mealSlot !== 'ALL') url += `&meal_slot=${encodeURIComponent(mealSlot)}`;
      return api.get(url);
    },
    updatePrepStatus: async (ingredientId: number, status: string, date: string) => {
      return api.patch(`/kds/prep-list/${ingredientId}/status?target_date=${date}`, { status });
    },
    getAssemblyList: async (date: string, mealSlot?: string) => {
      let url = `/kds/assembly-list?target_date=${date}`;
      if (mealSlot && mealSlot !== 'ALL') url += `&meal_slot=${encodeURIComponent(mealSlot)}`;
      return api.get(url);
    },
    updateAssemblyStatus: async (order_item_ulid: string, status: string) => {
      return api.patch(`/kds/assembly-list/${order_item_ulid}/status`, { status });
    }
  },
  orders: {
    list: (params: { page?: number; limit?: number; source?: string; target_date?: string; search?: string; customer_id?: number | 0; status?: string }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.source) searchParams.append("source", params.source);
      if (params.target_date) searchParams.append("target_date", params.target_date);
      if (params.search) searchParams.append("search", params.search);
      if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());
      if (params.status) searchParams.append("status", params.status);
      return api.get(`/orders?${searchParams.toString()}`);
    },
    preview: (payload: { customer_ulid: string; bowl_ulid: string; meal_slot: string }) =>
      api.post("/orders/preview", payload),
    checkout: (payload: any) =>
      api.post("/orders/checkout", payload),
    updateStatus: (ulid: string, status: string) =>
      api.patch(`/orders/${ulid}/status`, { status }),
    get: (ulid: string) =>
      api.get(`/orders/${ulid}`),
    delete: (ulid: string) =>
      api.del(`/orders/${ulid}`),
    updateItem: (orderUlid: string, itemUlid: string, payload: any) =>
      api.patch(`/orders/${orderUlid}/items/${itemUlid}`, payload),
    bulkAssignDriver: (payload: { order_ulids: string[], driver_ulid: string }) =>
      api.patch(`/orders/bulk-assign-driver`, payload),
    myDeliveries: () =>
      api.get(`/orders/my-deliveries`),
    confirmCod: (ulid: string) =>
      api.post(`/orders/${ulid}/confirm-cod`, {}),
    markDelivered: (ulid: string) =>
      api.post(`/orders/${ulid}/mark-delivered`, {}),
  },

  auth: {
    login: async (payload: { identifier: string; password: string; totp_code?: string }, rememberMe?: boolean): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      setMemoryAccessToken(response.access_token, rememberMe, response.refresh_token);
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
    getLowStockCount: async (): Promise<{ count: number }> => {
      return await api.get<{ count: number }>("/raw-materials/metrics/low-stock-count");
    },
    getRawMaterials: async (page: number, size: number, search?: string, stockout?: boolean, sort?: string): Promise<PaginatedRawMaterials> => {
      let query = `?page=${page}&size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (stockout) {
        query += `&stockout=true`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
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
    adjustStock: async (ulid: string, data: { quantity_change: number; description?: string }): Promise<RawMaterial> => {
      return await api.post<RawMaterial>(`/raw-materials/${ulid}/stock`, data);
    },
    updateStockThreshold: async (ulid: string, data: { stock_threshold: number }): Promise<RawMaterial> => {
      return await api.patch<RawMaterial>(`/raw-materials/${ulid}/stock-threshold`, data);
    },
    getStockLogs: async (ulid: string): Promise<StockLog[]> => {
      return await api.get<StockLog[]>(`/raw-materials/${ulid}/stock-logs`);
    },
    getCostLogs: async (ulid: string, page: number = 1, size: number = 20): Promise<import("./types").PaginatedCostLogs> => {
      let query = `?page=${page}&size=${size}`;
      return await api.get<import("./types").PaginatedCostLogs>(`/raw-materials/${ulid}/cost-logs${query}`);
    },
    purchases: {
      batchCreate: async (data: any[]) => {
        return await api.post<any[]>("/raw-materials/purchases/batch", data);
      },
      getDaily: async (date: string, page = 1, size = 50) => {
        return await api.get<any>(`/raw-materials/purchases/daily?date=${date}&page=${page}&size=${size}`);
      },
      getMonthly: async (month: string, page = 1, size = 50) => {
        return await api.get<any>(`/raw-materials/purchases/monthly?month=${month}&page=${page}&size=${size}`);
      },
      delete: async (id: number) => {
        return await api.del<void>(`/raw-materials/purchases/${id}`);
      },
    },
  },

  rawMaterialCategories: {
    getCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedRawMaterialCategories> => {
      let query = `?page=${page}&size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
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
    getIngredients: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedIngredients> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
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
      return await api.get<{ R2_BASE_URL: string }>("/settings/");
    },
    updateSystemSettings: async (payload: Record<string, string>): Promise<Record<string, string>> => {
      return await api.put<Record<string, string>>("/settings/", payload);
    },
  },

  bowlCategories: {
    getBowlCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedBowlCategories> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedBowlCategories>(`/bowl-categories${query}`);
    },
    getBowlCategory: async (ulid: string): Promise<BowlCategory> => {
      return await api.get<BowlCategory>(`/bowl-categories/${ulid}`);
    },
    createBowlCategory: async (data: BowlCategoryCreateInput): Promise<BowlCategory> => {
      return await api.post<BowlCategory>("/bowl-categories", data);
    },
    updateBowlCategory: async (ulid: string, data: BowlCategoryUpdateInput): Promise<BowlCategory> => {
      return await api.put<BowlCategory>(`/bowl-categories/${ulid}`, data);
    },
    deleteBowlCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/bowl-categories/${ulid}`);
    },
  },
  
  mealCategories: {
    getMealCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedMealCategories> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      const data = await api.get<PaginatedMealCategories>(`/meal-categories${query}`);
      if (data && data.items) {
        const order = ["breakfast", "lunch", "dinner", "snack", "drink"];
        data.items.sort((a, b) => {
          const slugA = (a.slug || "").toLowerCase();
          const slugB = (b.slug || "").toLowerCase();
          const idxA = order.findIndex(o => slugA.includes(o));
          const idxB = order.findIndex(o => slugB.includes(o));
          const weightA = idxA === -1 ? 999 : idxA;
          const weightB = idxB === -1 ? 999 : idxB;
          return weightA - weightB;
        });
      }
      return data;
    },
    getMealCategory: async (ulid: string): Promise<MealCategory> => {
      return await api.get<MealCategory>(`/meal-categories/${ulid}`);
    },
    createMealCategory: async (data: MealCategoryCreateInput): Promise<MealCategory> => {
      return await api.post<MealCategory>("/meal-categories", data);
    },
    updateMealCategory: async (ulid: string, data: MealCategoryUpdateInput): Promise<MealCategory> => {
      return await api.patch<MealCategory>(`/meal-categories/${ulid}`, data);
    },
    deleteMealCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/meal-categories/${ulid}`);
    },
  },

  vendors: {
    getVendors: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedVendors> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedVendors>(`/vendors${query}`);
    },
    getVendor: async (ulid: string): Promise<Vendor> => {
      return await api.get<Vendor>(`/vendors/${ulid}`);
    },
    createVendor: async (data: VendorCreateInput): Promise<Vendor> => {
      return await api.post<Vendor>("/vendors/", data);
    },
    updateVendor: async (ulid: string, data: VendorUpdateInput): Promise<Vendor> => {
      return await api.put<Vendor>(`/vendors/${ulid}`, data);
    },
    deleteVendor: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/vendors/${ulid}`);
    },
  },

  packagingComponents: {
    getComponents: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedPackagingComponents> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedPackagingComponents>(`/packaging/components${query}`);
    },
    createComponent: async (data: PackagingComponentCreateInput): Promise<PackagingComponent> => {
      return await api.post<PackagingComponent>("/packaging/components", data);
    },
    updateComponent: async (ulid: string, data: PackagingComponentUpdateInput): Promise<PackagingComponent> => {
      return await api.put<PackagingComponent>(`/packaging/components/${ulid}`, data);
    },
    deleteComponent: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/packaging/components/${ulid}`);
    },
  },

  packaging: {
    getBundles: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedPackaging> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedPackaging>(`/packaging${query}`);
    },
    getBundle: async (ulid: string): Promise<Packaging> => {
      return await api.get<Packaging>(`/packaging/${ulid}`);
    },
    createBundle: async (data: PackagingCreateInput): Promise<Packaging> => {
      return await api.post<Packaging>("/packaging", data);
    },
    updateBundle: async (ulid: string, data: PackagingUpdateInput): Promise<Packaging> => {
      return await api.put<Packaging>(`/packaging/${ulid}`, data);
    },
    deleteBundle: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/packaging/${ulid}`);
    },
    // Component stock management
    getComponents: async (page: number, size: number, search?: string): Promise<any> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      return await api.get(`/packaging/components${query}`);
    },
    adjustComponentStock: async (ulid: string, data: { quantity_change: number; description?: string }): Promise<any> => {
      return await api.post(`/packaging/components/${ulid}/stock`, data);
    },
    updateComponentStockThreshold: async (ulid: string, data: { stock_threshold: number }): Promise<any> => {
      return await api.patch(`/packaging/components/${ulid}/stock-threshold`, data);
    },
    getComponentStockLogs: async (ulid: string, page = 1, size = 20): Promise<any> => {
      return await api.get(`/packaging/components/${ulid}/stock-logs?page=${page}&size=${size}`);
    },
  },

    transactions: {
    logPayment: (customerUlid: string, payload: { amount: number, method: string, description: string }) => 
      api.post(`/customers/${customerUlid}/transactions`, payload),
    list: (customerUlid: string, page: number = 1) => 
      api.get(`/customers/${customerUlid}/transactions?page=${page}`),
  },
  customers: {
    list: async (params?: any) => {
      const p = new URLSearchParams();
      if (params?.page) p.append("page", params.page.toString());
      if (params?.limit) p.append("limit", params.limit.toString());
      if (params?.search) p.append("search", params.search);
      return await api.get(`/customers?${p.toString()}`);
    },
    get: async (ulid: string) => await api.get(`/customers/${ulid}`),
    create: async (data: any) => await api.post("/customers", data),
    update: async (ulid: string, data: any) => await api.patch(`/customers/${ulid}`, data),
    calculateCalories: async (data: any) => await api.post("/customers/calculate-calories", data),
    del: async (ulid: string) => await api.del(`/customers/${ulid}`),
  },
  planTiers: {
    list: async (params?: any) => {
      const p = new URLSearchParams();
      if (params?.page) p.append("page", params.page.toString());
      if (params?.limit) p.append("limit", params.limit.toString());
      if (params?.search) p.append("search", params.search);
      return await api.get(`/plans?${p.toString()}`);
    },
    get: async (ulid: string) => await api.get(`/plans/${ulid}`),
    create: async (data: any) => await api.post("/plans/", data),
    update: async (ulid: string, data: any) => await api.patch(`/plans/${ulid}`, data),
    delete: async (ulid: string) => await api.del(`/plans/${ulid}`),
  },
  notifications: {
    get: () => api.get<{ notifications: any[]; unread_count: number }>("/notifications"),
    markRead: (ulid: string) => api.patch(`/notifications/${ulid}/read`, {}),
    markAllRead: () => api.post("/notifications/mark-all-read", {}),
  },
  bowls: {
    getBowls: async (page: number, size: number, search?: string, sort?: string, mealCategoryUlid?: string, bowlCategoryUlid?: string, bowlType?: string, code?: string, createdById?: number, mealCategoryId?: number, bowlCategoryId?: number): Promise<PaginatedBowls> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (sort) query += `&sort=${encodeURIComponent(sort)}`;
      if (mealCategoryUlid) query += `&meal_category_ulid=${encodeURIComponent(mealCategoryUlid)}`;
      if (bowlCategoryUlid) query += `&bowl_category_ulid=${encodeURIComponent(bowlCategoryUlid)}`;
      if (mealCategoryId) query += `&meal_category_id=${mealCategoryId}`;
      if (bowlCategoryId) query += `&bowl_category_id=${bowlCategoryId}`;
      if (bowlType) query += `&bowl_type=${encodeURIComponent(bowlType)}`;
      if (code) query += `&code=${encodeURIComponent(code)}`;
      if (createdById) query += `&created_by_id=${createdById}`;
      return await api.get<PaginatedBowls>(`/bowls${query}`);
    },
    getBowl: async (ulid: string): Promise<Bowl> => {
      return await api.get<Bowl>(`/bowls/${ulid}`);
    },
    createBowl: async (data: BowlCreateInput): Promise<Bowl> => {
      return await api.post<Bowl>("/bowls/", data);
    },
    updateBowl: async (ulid: string, data: BowlUpdateInput): Promise<Bowl> => {
      return await api.put<Bowl>(`/bowls/${ulid}`, data);
    },
    deleteBowl: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/bowls/${ulid}`);
    },
  },
};
