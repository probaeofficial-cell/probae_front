import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createMenuBlueprintsApi = (api: ApiClient) => (
  {
    get: async (durationType: string, mealSlot: string, planCategory: string = 'Core') => await api.get(`/plans/blueprints?duration_type=${durationType}&meal_slot=${mealSlot}&plan_category=${planCategory}`),
    sync: async (data: {duration_type: string, meal_slot: string, plan_category: string, bowl_ulids: string[]}) => await api.post("/plans/blueprints/sync", data)
  }
);
