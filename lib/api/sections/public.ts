import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createPublicApi = (api: ApiClient) => (
  {
    calculateCalories: async (data: any): Promise<any> => {
      try {
        return await api.post<any>('/public/calculate-calories', data);
      } catch {
        return await api.post<any>('/customers/calculate-calories', data);
      }
    },
    getMenu: async (page = 1, limit = 10, meal_type = ''): Promise<any> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (meal_type) params.set('meal_type', meal_type);
      return await api.get<any>(`/public/menu?${params.toString()}`);
    },
    getMealCategories: async (): Promise<any> => {
      return await api.get<any>('/public/meal-categories');
    },
    getPlans: async (page = 1, limit = 9, category = ''): Promise<any> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (category) params.set('category', category);
      return await api.get<any>(`/public/plans?${params.toString()}`);
    },
    submitEnquiry: async (data: { 
      name: string; 
      phone: string; 
      email?: string; 
      message?: string; 
      plan_interest?: string;
      device_fingerprint?: string;
      meta_data?: any;
    }): Promise<any> => {
      return await api.post<any>('/public/enquiry', data);
    },
    getEnquirySuggestions: async (fingerprint?: string, phone?: string): Promise<any> => {
      const params = new URLSearchParams();
      if (fingerprint) params.set("fingerprint", fingerprint);
      if (phone) params.set("phone", phone);
      return await api.get<any>(`/public/enquiry-suggestions?${params.toString()}`);
    },
  }
);
