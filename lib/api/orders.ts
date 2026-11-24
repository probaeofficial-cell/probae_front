import type { api as SharedApiClient } from "../apiService";

type ApiClient = typeof SharedApiClient;

/** Order-related API calls, kept separate from the shared API client. */
export function createOrdersApi(api: ApiClient) {
  return {
    list: (params: { page?: number; limit?: number; source?: string; target_date?: string; search?: string; customer_id?: number | 0; status?: string; meal_slot?: string }) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.source) searchParams.append("source", params.source);
      if (params.target_date) searchParams.append("target_date", params.target_date);
      if (params.search) searchParams.append("search", params.search);
      if (params.customer_id) searchParams.append("customer_id", params.customer_id.toString());
      if (params.status) searchParams.append("status", params.status);
      if (params.meal_slot) searchParams.append("meal_slot", params.meal_slot);
      return api.get(`/orders?${searchParams.toString()}`);
    },
    dailyBowls: (params: { target_date?: string; meal_slot?: string; page?: number; limit?: number; search?: string; plan_category?: string }) => {
      const searchParams = new URLSearchParams();
      if (params.target_date) searchParams.append("target_date", params.target_date);
      if (params.meal_slot && params.meal_slot !== "ALL") searchParams.append("meal_slot", params.meal_slot);
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.limit) searchParams.append("limit", params.limit.toString());
      if (params.search) searchParams.append("search", params.search);
      if (params.plan_category && params.plan_category !== "ALL") searchParams.append("plan_category", params.plan_category);
      return api.get(`/orders/daily-bowls?${searchParams.toString()}`);
    },
    preview: (payload: { customer_ulid: string; bowl_ulid: string; meal_slot: string; scaling_strategy?: "PROFILE_SCALED" | "STANDARD"; target_calories?: number }) =>
      api.post("/orders/preview", payload),
    checkout: (payload: any) => api.post("/orders/checkout", payload),
    bulkUpdateItems: (ulid: string, payload: any) => api.put(`/orders/${ulid}/items`, payload),
    updateStatus: (ulid: string, status: string) => api.patch(`/orders/${ulid}/status`, { status }),
    get: (ulid: string) => api.get(`/orders/${ulid}`),
    downloadInvoice: (ulid: string) => api.get<Blob>(`/orders/${ulid}/invoice.pdf`, { responseType: "blob" }),
    delete: (ulid: string) => api.del(`/orders/${ulid}`),
    updateItem: (orderUlid: string, itemUlid: string, payload: any) => api.patch(`/orders/${orderUlid}/items/${itemUlid}`, payload),
    bulkAssignDriver: (payload: { order_ulids: string[]; driver_ulid: string | null }) => api.patch("/orders/bulk-assign-driver", payload),
    previewBulkAdjust: (payload: { order_numbers: string[]; new_amount: number; adjustment_mode?: string }) => api.post("/orders/preview-bulk-adjust", payload),
    bulkAdjustPrice: (payload: { order_numbers: string[]; new_amount: number; adjustment_mode?: string; reason?: string }) => api.post("/orders/bulk-adjust-price", payload),
    generateMessage: (ulid: string, channel: string, type: string) => api.get(`/orders/${ulid}/generate-message?channel=${channel}&type=${type}`),
    markMessageSent: (ulid: string, channel: string) => api.patch(`/orders/${ulid}/mark-message-sent`, { channel }),
    myDeliveries: () => api.get("/orders/my-deliveries"),
    myDeliveryOverview: (period: "today" | "week" | "month" = "today") => api.get(`/orders/my-deliveries/overview?period=${period}`),
    confirmCod: (ulid: string) => api.post(`/orders/${ulid}/confirm-cod`, {}),
    markDelivered: (ulid: string) => api.post(`/orders/${ulid}/mark-delivered`, {}),
    getBulkLegacySample: () => api.get<any>("/orders/legacy-bulk/sample"),
    downloadBulkLegacySampleCsv: () => api.get<Blob>("/orders/legacy-bulk/sample?format=csv", { responseType: "blob" }),
    uploadBulkLegacyOrders: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post<any>("/orders/legacy-bulk/upload", formData);
    },
    getBulkLegacyJob: (jobId: string) => api.get<any>(`/orders/legacy-bulk/jobs/${jobId}`),
    listBulkLegacyJobs: (limit: number = 15) => api.get<any>(`/orders/legacy-bulk/jobs?limit=${limit}`),
  };
}
