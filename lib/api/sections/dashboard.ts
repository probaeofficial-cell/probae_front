import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createDashboardApi = (api: ApiClient) => (
  {
    financials: (params: { start_date: string, end_date: string }) => api.get(`/dashboard/financials?start_date=${params.start_date}&end_date=${params.end_date}`),
    adminOverview: () => api.get('/dashboard/admin-overview')
  }
);
