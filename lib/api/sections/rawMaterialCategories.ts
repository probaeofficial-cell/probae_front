import type { api as SharedApiClient } from "../../apiService";
import type { RawMaterialCategory, RawMaterialCategoryCreateInput, RawMaterialCategoryUpdateInput, PaginatedRawMaterialCategories } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createRawMaterialCategoriesApi = (api: ApiClient) => (
  {
    getCategories: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedRawMaterialCategories> => {
      let query = `?page=${page}&size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedRawMaterialCategories>(`/raw-material-categories/${query}`);
    },
    getCategory: async (ulid: string): Promise<RawMaterialCategory> => {
      return await api.get<RawMaterialCategory>(`/raw-material-categories/${ulid}`);
    },
    createCategory: async (data: RawMaterialCategoryCreateInput): Promise<RawMaterialCategory> => {
      return await api.post<RawMaterialCategory>("/raw-material-categories/", data);
    },
    updateCategory: async (ulid: string, data: RawMaterialCategoryUpdateInput): Promise<RawMaterialCategory> => {
      return await api.patch<RawMaterialCategory>(`/raw-material-categories/${ulid}`, data);
    },
    deleteCategory: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/raw-material-categories/${ulid}`);
    },
  }
);
