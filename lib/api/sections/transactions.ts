import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createTransactionsApi = (api: ApiClient) => (
  {
    logPayment: (customerUlid: string, payload: { amount: number, method: string, description: string, transaction_date?: string, payment_to?: string }) => 
      api.post(`/customers/${customerUlid}/transactions`, payload),
    list: (customerUlid: string, page: number = 1, transaction_type?: string) => 
      api.get(`/customers/${customerUlid}/transactions?page=${page}${transaction_type ? `&transaction_type=${encodeURIComponent(transaction_type)}` : ''}`),
    listGlobal: (params: any) => {
      const p = new URLSearchParams();
      if (params.page) p.append("page", params.page.toString());
      if (params.limit) p.append("limit", params.limit.toString());
      if (params.search) p.append("search", params.search);
      if (params.transaction_type) p.append("transaction_type", params.transaction_type);
      if (params.date_from) p.append("date_from", params.date_from);
      if (params.date_to) p.append("date_to", params.date_to);
      if (params.is_manual) p.append("is_manual", "true");
      return api.get(`/transactions?${p.toString()}`);
    },
    dailySummary: (dateFrom?: string, dateTo?: string) => {
      const p = new URLSearchParams();
      if (dateFrom) p.append('date_from', dateFrom);
      if (dateTo) p.append('date_to', dateTo);
      return api.get(`/transactions/daily-summary${p.toString() ? `?${p.toString()}` : ''}`);
    },
    delete: (ulid: string) => api.delete(`/transactions/${ulid}`),
  }
);
