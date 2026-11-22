import type { api as SharedApiClient } from "../../apiService";
import type { Ingredient, IngredientCreateInput, IngredientUpdateInput, PaginatedIngredients, ComponentCodePrefix, NextIngredientCodeResponse } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createIngredientsApi = (api: ApiClient) => (
  {
    getIngredients: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedIngredients> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedIngredients>(`/ingredients/${query}`);
    },
    list: async (page: number = 1, size: number = 100, search?: string): Promise<PaginatedIngredients> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      return await api.get<PaginatedIngredients>(`/ingredients/${query}`);
    },

    getIngredient: async (ulid: string): Promise<Ingredient> => {
      return await api.get<Ingredient>(`/ingredients/${ulid}`);
    },
    getNextCode: async (prefix: ComponentCodePrefix): Promise<NextIngredientCodeResponse> => {
      return await api.get<NextIngredientCodeResponse>(`/ingredients/next-code?prefix=${encodeURIComponent(prefix)}`);
    },
    createIngredient: async (data: IngredientCreateInput): Promise<Ingredient> => {
      return await api.post<Ingredient>("/ingredients/", data);
    },
    updateIngredient: async (ulid: string, data: IngredientUpdateInput): Promise<Ingredient> => {
      return await api.put<Ingredient>(`/ingredients/${ulid}`, data);
    },
    deleteIngredient: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/ingredients/${ulid}`);
    },
  }
);
