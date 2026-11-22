import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createKdsApi = (api: ApiClient) => (
  {
    getPrepList: async (date: string, mealSlot?: string) => {
      let url = `/kds/prep-list?target_date=${date}`;
      if (mealSlot && mealSlot !== 'ALL') url += `&meal_slot=${encodeURIComponent(mealSlot)}`;
      return api.get(url);
    },
    updatePrepStatus: async (ingredientId: number, status: string, date: string, current_weight?: number) => {
      return api.patch(`/kds/prep-list/${ingredientId}/status?target_date=${date}`, { status, current_weight });
    },
    getAssemblyList: async (date: string, mealSlot?: string) => {
      let url = `/kds/assembly-list?target_date=${date}`;
      if (mealSlot && mealSlot !== 'ALL') url += `&meal_slot=${encodeURIComponent(mealSlot)}`;
      return api.get(url);
    },
    updateAssemblyStatus: async (order_item_ulid: string, status: string) => {
      return api.patch(`/kds/assembly-list/${order_item_ulid}/status`, { status });
    }
  }
);
