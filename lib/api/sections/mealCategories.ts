import type { api as SharedApiClient } from "../../apiService";
import type { MealCategory, MealCategoryCreateInput, MealCategoryUpdateInput, PaginatedMealCategories } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createMealCategoriesApi = (api: ApiClient) => (
  {
    getMealCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedMealCategories> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      const data = await api.get<PaginatedMealCategories>(`/meal-categories${query}`);
      if (data && data.items) {
        const order = ["breakfast", "lunch", "dinner", "snack", "drink"];
        data.items.sort((a, b) => {
          const slugA = (a.slug || "").toLowerCase();
          const slugB = (b.slug || "").toLowerCase();
          const idxA = order.findIndex(o => slugA.includes(o));
          const idxB = order.findIndex(o => slugB.includes(o));
          const weightA = idxA === -1 ? 999 : idxA;
          const weightB = idxB === -1 ? 999 : idxB;
          return weightA - weightB;
        });
      }
      return data;
    },
    getMealCategory: async (ulid: string): Promise<MealCategory> => {
      return await api.get<MealCategory>(`/meal-categories/${ulid}`);
    },
    createMealCategory: async (data: MealCategoryCreateInput): Promise<MealCategory> => {
      return await api.post<MealCategory>("/meal-categories", data);
    },
    updateMealCategory: async (ulid: string, data: MealCategoryUpdateInput): Promise<MealCategory> => {
      return await api.patch<MealCategory>(`/meal-categories/${ulid}`, data);
    },
    deleteMealCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/meal-categories/${ulid}`);
    },
  }
);
