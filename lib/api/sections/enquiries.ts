import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createEnquiriesApi = (api: ApiClient) => (
  {
    list: async (page = 1, limit = 20, status = ''): Promise<any> => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set('status', status);
      return await api.get<any>(`/enquiries?${params.toString()}`);
    },
    get: async (ulid: string): Promise<any> => {
      return await api.get<any>(`/enquiries/${ulid}`);
    },
    updateStatus: async (ulid: string, status: string): Promise<any> => {
      return await api.patch<any>(`/enquiries/${ulid}/status`, { status });
    },
    delete: async (ulid: string): Promise<any> => {
      return await api.del<any>(`/enquiries/${ulid}`);
    },
  }
);
