import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createLogisticsApi = (api: ApiClient) => (
  {
    getZones: async (activeOnly: boolean = true) => {
      return api.get(`/logistics/zones?active_only=${activeOnly}`);
    },
    createZone: async (data: any) => {
      return api.post(`/logistics/zones`, data);
    },
    updateZone: async (ulid: string, data: any) => {
      return api.patch(`/logistics/zones/${ulid}`, data);
    },
    getDrivers: async (activeOnly: boolean = true) => {
      return api.get(`/logistics/drivers?active_only=${activeOnly}`);
    },
    createDriver: async (data: any) => {
      return api.post(`/logistics/drivers`, data);
    },
    updateDriver: async (ulid: string, data: any) => {
      return api.patch(`/logistics/drivers/${ulid}`, data);
    },
  }
);
