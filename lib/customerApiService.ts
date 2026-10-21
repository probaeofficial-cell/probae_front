/**
 * customerApiService.ts
 *
 * Dedicated, unauthenticated API Service for the customer-facing website and onboarding flow.
 *
 * Key design guarantees:
 * 1. Independent of admin session & tokens (no admin Bearer tokens injected).
 * 2. NEVER redirects to /admin/login or /delivery/login on 401 or any error.
 * 3. Does not run admin token refresh logic (/auth/refresh).
 * 4. Graceful error handling returning typed errors or safe defaults.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.probae.in/api/v1";

export interface CustomerFetchOptions extends Omit<RequestInit, "body"> {
  body?: any;
}

export class CustomerApiError extends Error {
  public status: number;
  public detail?: any;
  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function customerFetch<T>(endpoint: string, options: CustomerFetchOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    body = JSON.stringify(body);
  }

  const config: RequestInit = {
    cache: "no-store",
    ...options,
    headers,
    body,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      let detail = null;
      try {
        const errorData = await response.json();
        detail = errorData.detail;
        if (errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
            errorMessage = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join(", ");
          }
        }
      } catch {
        // Response was not JSON
      }

      // DO NOT REDIRECT ON 401! Just throw the error so the UI can handle or fallback gracefully.
      throw new CustomerApiError(errorMessage, response.status, detail);
    }

    if (response.status === 204) {
      return null as any;
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

export const customerApi = {
  get: <T>(endpoint: string, options?: Omit<CustomerFetchOptions, "method" | "body">) =>
    customerFetch<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, data?: any, options?: Omit<CustomerFetchOptions, "method" | "body">) =>
    customerFetch<T>(endpoint, { ...options, method: "POST", body: data }),

  put: <T>(endpoint: string, data?: any, options?: Omit<CustomerFetchOptions, "method" | "body">) =>
    customerFetch<T>(endpoint, { ...options, method: "PUT", body: data }),

  patch: <T>(endpoint: string, data?: any, options?: Omit<CustomerFetchOptions, "method" | "body">) =>
    customerFetch<T>(endpoint, { ...options, method: "PATCH", body: data }),

  del: <T>(endpoint: string, options?: Omit<CustomerFetchOptions, "method" | "body">) =>
    customerFetch<T>(endpoint, { ...options, method: "DELETE" }),
};

export interface CalculateCaloriesPayload {
  sex: string;
  age: number;
  height: number;
  weight: number;
  activity_level: string;
  goal: string;
}

export interface CalorieProfileResult {
  total: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  probaeTarget?: number;
  mealCalories?: Record<string, number>;
  lockedMeals?: Record<string, boolean>;
  mealSlots?: string[];
}

export const customerEndpoints = {
  /**
   * Public Calorie Calculation
   * Calibrates user's BMR, TDEE and macronutrient baseline without requiring login.
   */
  calculateCalories: async (data: CalculateCaloriesPayload): Promise<CalorieProfileResult> => {
    try {
      return await customerApi.post<CalorieProfileResult>("/public/calculate-calories", data);
    } catch {
      // Fallback to /customers/calculate-calories
      return await customerApi.post<CalorieProfileResult>("/customers/calculate-calories", data);
    }
  },

  /**
   * Public Menu Items
   */
  getMenu: async (page = 1, limit = 50, mealType = ""): Promise<any> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (mealType) params.set("meal_type", mealType);
    return await customerApi.get<any>(`/public/menu?${params.toString()}`);
  },

  /**
   * Public Meal Categories
   */
  getMealCategories: async (): Promise<any> => {
    return await customerApi.get<any>("/public/meal-categories");
  },

  /**
   * Public Plans
   */
  getPlans: async (page = 1, limit = 9, category = ""): Promise<any> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) params.set("category", category);
    return await customerApi.get<any>(`/public/plans?${params.toString()}`);
  },

  /**
   * Filtered Plans for Onboarding
   */
  getFilteredPlans: async (filters: {
    duration?: string;
    frequency?: string;
    days?: number;
    mealSlots?: string[];
    category?: string;
  }): Promise<any> => {
    const params = new URLSearchParams({ limit: "50" });
    if (filters.duration) params.set("duration", filters.duration);
    if (filters.frequency) params.set("frequency", filters.frequency);
    if (filters.days) params.set("days", String(filters.days));
    if (filters.mealSlots && filters.mealSlots.length > 0) {
      params.set("meal_slots", filters.mealSlots.join(","));
    }
    if (filters.category) params.set("category", filters.category);
    return await customerApi.get<any>(`/public/plans?${params.toString()}`);
  },

  /**
   * Public Plan Price & Bowl Rotation Preview
   */
  previewPlanPrice: async (payload: {
    plan_tier_ulid?: string;
    duration?: string;
    days?: number;
    frequency?: string;
    meal_slots?: string[];
    calorie_profile?: any;
    goal?: string;
    discount_percentage?: number;
  }): Promise<any> => {
    return await customerApi.post<any>("/public/preview-plan-price", payload);
  },

  /**
   * Public Enquiry Submission
   */
  submitEnquiry: async (data: {
    name: string;
    phone: string;
    email?: string;
    message?: string;
    plan_interest?: string;
  }): Promise<any> => {
    return await customerApi.post<any>("/public/enquiry", data);
  },
};
