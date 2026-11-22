import type { api as SharedApiClient } from "../../apiService";
import type { UserProfile } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createUsersApi = (api: ApiClient) => (
  {
    getMe: async () => {
      return await api.get<UserProfile>("/auth/me");
    },
    updateProfile: async (data: { profile_picture_id?: number; full_name?: string | null }) => {
      return await api.patch<UserProfile>("/auth/me", data);
    },
  }
);
