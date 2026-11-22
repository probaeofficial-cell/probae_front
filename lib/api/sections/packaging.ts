import type { api as SharedApiClient } from "../../apiService";
import type { PaginatedPackaging, Packaging, PackagingCreateInput, PackagingUpdateInput } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createPackagingApi = (api: ApiClient) => (
  {
    getBundles: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedPackaging> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedPackaging>(`/packaging/${query}`);
    },
    getBundle: async (ulid: string): Promise<Packaging> => {
      return await api.get<Packaging>(`/packaging/${ulid}`);
    },
    createBundle: async (data: PackagingCreateInput): Promise<Packaging> => {
      return await api.post<Packaging>("/packaging/", data);
    },
    updateBundle: async (ulid: string, data: PackagingUpdateInput): Promise<Packaging> => {
      return await api.put<Packaging>(`/packaging/${ulid}`, data);
    },
    deleteBundle: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/packaging/${ulid}`);
    },
    // Component stock management
    getComponents: async (page: number, size: number, search?: string, stock_status?: string): Promise<any> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (stock_status) query += `&stock_status=${encodeURIComponent(stock_status)}`;
      return await api.get(`/packaging/components${query}`);
    },
    stockIn: async (ulid: string, data: { quantity: number; reference_type?: string; reference_id?: string; remarks?: string }): Promise<any> => {
      return await api.post(`/packaging/components/${ulid}/stock-in`, data);
    },
    adjustComponentStock: async (ulid: string, data: { quantity_change: number; description?: string; reference_type?: string; reference_id?: string; remarks?: string }): Promise<any> => {
      return await api.post(`/packaging/components/${ulid}/stock`, data);
    },
    updateComponentStockThreshold: async (ulid: string, data: { stock_threshold: number }): Promise<any> => {
      return await api.patch(`/packaging/components/${ulid}/stock-threshold`, data);
    },
    getComponentStockLogs: async (ulid: string, page = 1, size = 20): Promise<any> => {
      return await api.get(`/packaging/components/${ulid}/stock-logs?page=${page}&size=${size}`);
    },
  }
);
