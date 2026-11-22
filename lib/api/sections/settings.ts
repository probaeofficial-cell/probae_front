import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createSettingsApi = (api: ApiClient) => (
  {
    getSystemSettings: async (): Promise<{ R2_BASE_URL: string }> => {
      return await api.get<{ R2_BASE_URL: string }>("/settings/");
    },
    updateSystemSettings: async (payload: Record<string, string>): Promise<Record<string, string>> => {
      return await api.put<Record<string, string>>("/settings/", payload);
    },
    getPaymentRecipients: async (): Promise<any> => {
      return await api.get<any>('/settings/payment-recipients');
    },
    calculateDeliveryCharge: async (customerUlid: string): Promise<{
      distance_km: number | null;
      delivery_charge: number;
      free_km: number;
      billable_km: number;
      charge_per_km: number;
      configured: boolean;
      no_location: boolean;
    }> => {
      return await api.post("/orders/calculate-delivery", { customer_ulid: customerUlid });
    },
  }
);
