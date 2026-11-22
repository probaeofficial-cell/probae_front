import type { api as SharedApiClient } from "../../apiService";
import type { AdminUsersResponse } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createAdminUsersApi = (api: ApiClient) => (
  {
    list: async (skip: number, limit: number, search?: string, role?: string): Promise<AdminUsersResponse> => {
      const params = new URLSearchParams({ skip: String(skip), limit: String(limit) });
      if (search) params.set("search", search);
      if (role) params.set("role", role);
      return api.get<AdminUsersResponse>(`/auth/admin?${params.toString()}`);
    },
  }
);
