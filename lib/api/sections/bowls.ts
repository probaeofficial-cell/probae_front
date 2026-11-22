import type { api as SharedApiClient } from "../../apiService";
import type { PaginatedBowls, Bowl, BowlCreateInput, BowlUpdateInput } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createBowlsApi = (api: ApiClient) => (
  {
    getBowls: async (page: number, size: number, search?: string, sort?: string, mealCategoryUlid?: string, bowlCategoryUlid?: string, bowlType?: string, code?: string, createdById?: number, mealCategoryId?: number, bowlCategoryId?: number): Promise<PaginatedBowls> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (sort) query += `&sort=${encodeURIComponent(sort)}`;
      if (mealCategoryUlid) query += `&meal_category_ulid=${encodeURIComponent(mealCategoryUlid)}`;
      if (bowlCategoryUlid) query += `&bowl_category_ulid=${encodeURIComponent(bowlCategoryUlid)}`;
      if (mealCategoryId) query += `&meal_category_id=${mealCategoryId}`;
      if (bowlCategoryId) query += `&bowl_category_id=${bowlCategoryId}`;
      if (bowlType) query += `&bowl_type=${encodeURIComponent(bowlType)}`;
      if (code) query += `&code=${encodeURIComponent(code)}`;
      if (createdById) query += `&created_by_id=${createdById}`;
      return await api.get<PaginatedBowls>(`/bowls${query}`);
    },
    getBowl: async (ulid: string): Promise<Bowl> => {
      return await api.get<Bowl>(`/bowls/${ulid}`);
    },
    createBowl: async (data: BowlCreateInput): Promise<Bowl> => {
      return await api.post<Bowl>("/bowls", data);
    },
    updateBowl: async (ulid: string, data: BowlUpdateInput): Promise<Bowl> => {
      return await api.put<Bowl>(`/bowls/${ulid}`, data);
    },
    deleteBowl: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/bowls/${ulid}`);
    },
  }
);
