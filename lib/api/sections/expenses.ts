import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createExpensesApi = (api: ApiClient) => (
  {
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
    deleteCategory: (ulid: string) => api.del(`/expenses/categories/${ulid}`),
    dashboardMetrics: (dateFrom: string, dateTo: string) => api.get(`/expenses/dashboard?date_from=${dateFrom}&date_to=${dateTo}`),
    list: (params: { page?: number, limit?: number, month?: string, category_ulid?: string, search?: string, date_from?: string, date_to?: string, min_amount?: number, max_amount?: number, sent_from?: string, recorded_by?: string }) => {
      const q = new URLSearchParams();
      if (params.page) q.append('page', params.page.toString());
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.month) q.append('month', params.month);
      if (params.category_ulid) q.append('category_ulid', params.category_ulid);
      if (params.search) q.append('search', params.search);
      if (params.date_from) q.append('date_from', params.date_from);
      if (params.date_to) q.append('date_to', params.date_to);
      if (params.min_amount !== undefined) q.append('min_amount', params.min_amount.toString());
      if (params.max_amount !== undefined) q.append('max_amount', params.max_amount.toString());
      if (params.sent_from) q.append('sent_from', params.sent_from);
      if (params.recorded_by) q.append('recorded_by', params.recorded_by);
      return api.get(`/expenses?${q.toString()}`);
    },
    create: (payload: any) => api.post('/expenses', payload),
    bulkCreate: (payload: any) => api.post('/expenses/bulk', payload),
    update: (ulid: string, payload: any) => api.put(`/expenses/${ulid}`, payload),
    del: (ulid: string) => api.del(`/expenses/${ulid}`),
    getSettlements: (params?: { date_from?: string; date_to?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.date_from) q.append('date_from', params.date_from);
      if (params?.date_to) q.append('date_to', params.date_to);
      if (params?.search) q.append('search', params.search);
      return api.get(`/expenses/settlements?${q.toString()}`);
    },
    getSettlementDetails: (recipientName: string, params?: { date_from?: string; date_to?: string; limit?: number }) => {
      const q = new URLSearchParams();
      q.append('recipient_name', recipientName);
      if (params?.date_from) q.append('date_from', params.date_from);
      if (params?.date_to) q.append('date_to', params.date_to);
      if (params?.limit) q.append('limit', params.limit.toString());
      return api.get(`/expenses/settlements/details?${q.toString()}`);
    }
  }
);
