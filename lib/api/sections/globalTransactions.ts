import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createGlobalTransactionsApi = (api: ApiClient) => (
  {
    delete: (ulid: string) => api.del(`/transactions/${ulid}`),
    list: (params: { page?: number, limit?: number, transaction_type?: string, date_from?: string, date_to?: string, search?: string }) => {
      const q = new URLSearchParams();
      if (params.page) q.append('page', params.page.toString());
      if (params.limit) q.append('limit', params.limit.toString());
      if (params.transaction_type) q.append('transaction_type', params.transaction_type);
      if (params.date_from) q.append('date_from', params.date_from);
      if (params.date_to) q.append('date_to', params.date_to);
      if (params.search) q.append('search', params.search);
      return api.get(`/transactions?${q.toString()}`);
    },
    dailySummary: (dateFrom?: string, dateTo?: string) => {
      const p = new URLSearchParams();
      if (dateFrom) p.append('date_from', dateFrom);
      if (dateTo) p.append('date_to', dateTo);
      return api.get(`/transactions/daily-summary${p.toString() ? `?${p.toString()}` : ''}`);
    }
  }
);
