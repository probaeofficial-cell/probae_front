import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export type Badge = {
  ulid: string;
  name: string;
  description: string | null;
  image_filename: string;
  assignment_mode: "AUTO" | "MANUAL";
  minimum_delivered_orders: number | null;
  minimum_subscriptions: number | null;
  points: number;
  is_active: boolean;
  assigned_count: number;
};

export type BadgeAssignment = {
  badge: Pick<Badge, "ulid" | "name" | "description" | "image_filename" | "assignment_mode"> & {
    assignment_source: "AUTO" | "MANUAL";
    assigned_at: string;
    points_awarded: number;
  };
  customer_ulid: string;
  customer_name: string;
  customer_phone: string;
};

export const createBadgesApi = (api: ApiClient) => ({
  list: (): Promise<Badge[]> => api.get("/badges"),
  create: (data: Partial<Badge>): Promise<Badge> => api.post("/badges", data),
  update: (ulid: string, data: Partial<Badge>): Promise<Badge> => api.patch(`/badges/${ulid}`, data),
  delete: (ulid: string) => api.delete(`/badges/${ulid}`),
  assignments: (): Promise<BadgeAssignment[]> => api.get("/badges/assignments"),
  assign: (badgeUlid: string, customerUlid: string): Promise<BadgeAssignment> =>
    api.post(`/badges/${badgeUlid}/assign`, { customer_ulid: customerUlid }),
  removeAssignment: (badgeUlid: string, customerUlid: string) =>
    api.delete(`/badges/${badgeUlid}/assign/${customerUlid}`),
  customerBadges: (customerUlid: string) => api.get(`/badges/customers/${customerUlid}`),
});
