import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createNotificationsApi = (api: ApiClient) => (
  {
    get: () => api.get<{ notifications: any[]; unread_count: number }>("/notifications/"),
    markRead: (ulid: string) => api.patch(`/notifications/${ulid}/read`, {}),
    markAllRead: () => api.post("/notifications/mark-all-read", {}),
  }
);
