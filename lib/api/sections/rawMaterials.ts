import type { api as SharedApiClient } from "../../apiService";
import type { RawMaterial, RawMaterialCreateInput, RawMaterialUpdateInput, PaginatedRawMaterials, MacrosUpdatePayload, StockLog } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createRawMaterialsApi = (api: ApiClient) => (
  {
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
    getCostLogs: async (ulid: string, page: number = 1, size: number = 20): Promise<import("../../types").PaginatedCostLogs> => {
      const query = `?page=${page}&size=${size}`;
      return await api.get<import("../../types").PaginatedCostLogs>(`/raw-materials/${ulid}/cost-logs${query}`);
    },
    getBulkSample: async (): Promise<any> => {
      return await api.get<any>("/raw-materials/bulk/sample");
    },
    downloadBulkSampleCsv: async (): Promise<Blob> => {
      return await api.get<Blob>("/raw-materials/bulk/sample?format=csv", { responseType: "blob" });
    },
    uploadBulkRawMaterials: async (file: File): Promise<any> => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<any>("/raw-materials/bulk/upload", formData);
    },
    getBulkJob: async (jobId: string): Promise<any> => {
      return await api.get<any>(`/raw-materials/bulk/jobs/${jobId}`);
    },
    cancelBulkJob: async (jobId: string): Promise<any> => {
      return await api.post<any>(`/raw-materials/bulk/jobs/${jobId}/cancel`, {});
    },
    listBulkJobs: async (limit: number = 15): Promise<any> => {
      return await api.get<any>(`/raw-materials/bulk/jobs?limit=${limit}`);
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
  }
);
