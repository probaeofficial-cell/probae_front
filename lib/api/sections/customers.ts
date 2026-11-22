import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createCustomersApi = (api: ApiClient) => (
  {
    list: async (params?: any) => {
      const p = new URLSearchParams();
      if (params?.page) p.append("page", params.page.toString());
      if (params?.limit) p.append("limit", params.limit.toString());
      if (params?.search) p.append("search", params.search);
      if (params?.only_dues) p.append("only_dues", "true");
      if (params?.is_affiliate !== undefined) p.append("is_affiliate", params.is_affiliate.toString());
      if (params?.plan_id) p.append("plan_id", params.plan_id.toString());
      if (params?.period) p.append("period", params.period);
      if (params?.date_from) p.append("date_from", params.date_from);
      if (params?.date_to) p.append("date_to", params.date_to);
      if (params?.category) p.append("category", params.category);
      if (params?.duration) p.append("duration", params.duration);
      if (params?.days) p.append("days", params.days.toString());

      return await api.get(`/customers?${p.toString()}`);
    },
    get: async (ulid: string) => await api.get(`/customers/${ulid}`),
    downloadOrderReport: async (ulid: string, params: { scope: "CUSTOMER" | "SUBSCRIPTION"; date_from: string; date_to: string }): Promise<Blob> => {
      const query = new URLSearchParams({ scope: params.scope, date_from: params.date_from, date_to: params.date_to });
      return await api.get<Blob>(`/customers/${ulid}/order-report.pdf?${query.toString()}`, { responseType: "blob" });
    },
    create: async (data: any) => await api.post("/customers", data),
    update: async (ulid: string, data: any) => await api.patch(`/customers/${ulid}`, data),
    getCalories: async (ulid: string, filterDate?: string, page: number = 1, limit: number = 5) => {
      const p = new URLSearchParams();
      if (filterDate) p.append("filter_date", filterDate);
      p.append("page", page.toString());
      p.append("limit", limit.toString());
      return await api.get(`/customers/${ulid}/calories?${p.toString()}`);
    },
    calculateCalories: async (data: any) => await api.post("/customers/calculate-calories", data),
    previewPlanPrice: async (data: any) => await api.post("/customers/preview-plan-price", data),
    previewCustomPlanPrice: async (data: any) => await api.post("/customers/preview-custom-plan", data),
    customizeBowl: async (customerUlid: string, data: {
      schedule_ulid?: string;
      bowl_ulid: string;
      apply_to_all_days: boolean;
      custom_ingredients: any[];
    }): Promise<any> => await api.patch(`/customers/${customerUlid}/meal-schedule/customize-bowl`, data),
    del: async (ulid: string) => await api.del(`/customers/${ulid}`),
    migrateActivePlan: async (ulid: string, data: any) => await api.post(`/customers/${ulid}/migrate-active-plan`, data),
    legacySubscription: async (ulid: string, data: any) => await api.post(`/customers/${ulid}/legacy-subscription`, data),
    cancelPlan: async (ulid: string, data: { remove_transaction: boolean; remove_remaining_bowls: boolean; delete_future_orders: boolean; reason?: string }) => await api.post(`/customers/${ulid}/cancel-plan`, data),
    updateDeliveryStatus: async (ulid: string, data: any) => await api.patch(`/customers/${ulid}/delivery-status`, data),
    legacyOrder: async (ulid: string, data: any) => await api.post(`/orders/customers/${ulid}/legacy-order`, data),
    updateLegacyOrder: async (ulid: string, orderUlid: string, data: any) => await api.put(`/orders/customers/${ulid}/legacy-order/${orderUlid}`, data),
    deleteLegacyOrder: async (ulid: string, orderUlid: string) => await api.delete(`/orders/customers/${ulid}/legacy-order/${orderUlid}`),
    getAffiliatePreview: async (ulid: string, params?: { period?: string; date_from?: string; date_to?: string }): Promise<any> => {
      const p = new URLSearchParams();
      if (params?.period) p.append("period", params.period);
      if (params?.date_from) p.append("date_from", params.date_from);
      if (params?.date_to) p.append("date_to", params.date_to);
      return await api.get(`/customers/affiliates/${ulid}/preview?${p.toString()}`);
    },
    assignReferral: async (affiliateUlid: string, customerUlid: string): Promise<any> =>
      await api.post(`/customers/affiliates/${affiliateUlid}/assign-referral`, { customer_ulid: customerUlid }),
    unassignReferral: async (affiliateUlid: string, customerUlid: string): Promise<any> =>
      await api.del(`/customers/affiliates/${affiliateUlid}/referrals/${customerUlid}`),
    assignAffiliateReferral: async (affiliateUlid: string, customerUlid: string): Promise<any> =>
      await api.post(`/customers/assign-affiliate-referral`, { affiliate_ulid: affiliateUlid, customer_ulid: customerUlid }),
  }
);
