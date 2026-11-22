import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createPlanTiersApi = (api: ApiClient) => (
  {
    list: async (params?: any) => {
      const p = new URLSearchParams();
      if (params?.page) p.append("page", params.page.toString());
      if (params?.limit) p.append("limit", params.limit.toString());
      if (params?.search) p.append("search", params.search);
      if (params?.is_affiliate !== undefined) p.append("is_affiliate", params.is_affiliate.toString());
      if (params?.plan_id) p.append("plan_id", params.plan_id.toString());
      if (params?.period) p.append("period", params.period);
      if (params?.date_from) p.append("date_from", params.date_from);
      if (params?.date_to) p.append("date_to", params.date_to);
      if (params?.category) p.append("category", params.category);
      if (params?.duration) p.append("duration", params.duration);
      if (params?.days) p.append("days", params.days.toString());

      return await api.get(`/plans/tiers?${p.toString()}`);
    },
    get: async (ulid: string) => await api.get(`/plans/tiers/${ulid}`),
    create: async (data: any) => await api.post("/plans/tiers", data),
    update: async (ulid: string, data: any) => await api.patch(`/plans/tiers/${ulid}`, data),
    delete: async (ulid: string) => await api.del(`/plans/tiers/${ulid}`),
    triggerDailyOrders: async (targetDay: string = 'tomorrow') => await api.post(`/plans/trigger-daily-orders?target_day=${targetDay}`, {}),
    calculate: async (payload: any) => await api.post("/plans/calculate", payload),
    saveCalculation: async (payload: any) => await api.post("/plans/calculations", payload),
    listCalculations: async (params?: { page?: number; limit?: number; search?: string; plan_type?: string; customer_id?: number }) => {
      const p = new URLSearchParams();
      if (params?.page) p.append("page", params.page.toString());
      if (params?.limit) p.append("limit", params.limit.toString());
      if (params?.search) p.append("search", params.search);
      if (params?.plan_type) p.append("plan_type", params.plan_type);
      if (params?.customer_id) p.append("customer_id", params.customer_id.toString());
      return await api.get(`/plans/calculations?${p.toString()}`);
    },
    getCalculation: async (ulid: string) => await api.get(`/plans/calculations/${ulid}`),
    deleteCalculation: async (ulid: string) => await api.del(`/plans/calculations/${ulid}`),
    getBulkSample: async (): Promise<any> => {
      return await api.get<any>("/plans/tiers/bulk/sample");
    },
    downloadBulkSampleCsv: async (): Promise<Blob> => {
      return await api.get<Blob>("/plans/tiers/bulk/sample?format=csv", { responseType: "blob" });
    },
    uploadBulkPlanTiers: async (file: File): Promise<any> => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<any>("/plans/tiers/bulk/upload", formData);
    },
    getBulkJob: async (jobId: string): Promise<any> => {
      return await api.get<any>(`/plans/tiers/bulk/jobs/${jobId}`);
    },
    cancelBulkJob: async (jobId: string): Promise<any> => {
      return await api.post<any>(`/plans/tiers/bulk/jobs/${jobId}/cancel`, {});
    },
    listBulkJobs: async (limit: number = 15): Promise<any> => {
      return await api.get<any>(`/plans/tiers/bulk/jobs?limit=${limit}`);
    },
  }
);
