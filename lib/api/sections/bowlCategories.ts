import type { api as SharedApiClient } from "../../apiService";
import type { BowlCategory, BowlCategoryCreateInput, BowlCategoryUpdateInput, PaginatedBowlCategories } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createBowlCategoriesApi = (api: ApiClient) => (
  {
    getBowlCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedBowlCategories> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedBowlCategories>(`/bowl-categories${query}`);
    },
    getBowlCategory: async (ulid: string): Promise<BowlCategory> => {
      return await api.get<BowlCategory>(`/bowl-categories/${ulid}`);
    },
    createBowlCategory: async (data: BowlCategoryCreateInput): Promise<BowlCategory> => {
      return await api.post<BowlCategory>("/bowl-categories", data);
    },
    updateBowlCategory: async (ulid: string, data: BowlCategoryUpdateInput): Promise<BowlCategory> => {
      return await api.put<BowlCategory>(`/bowl-categories/${ulid}`, data);
    },
    deleteBowlCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/bowl-categories/${ulid}`);
    },
  }
);
