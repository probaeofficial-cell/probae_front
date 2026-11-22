import type { api as SharedApiClient } from "../../apiService";
import type { PaginatedPackagingComponents, PackagingComponent, PackagingComponentCreateInput, PackagingComponentUpdateInput } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createPackagingComponentsApi = (api: ApiClient) => (
  {
    getComponents: async (page: number, size: number, search?: string, sort?: string, stock_status?: string, exclude_children?: boolean): Promise<PaginatedPackagingComponents> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      if (stock_status) {
        query += `&stock_status=${encodeURIComponent(stock_status)}`;
      }
      if (exclude_children) {
        query += `&exclude_children=true`;
      }
      return await api.get<PaginatedPackagingComponents>(`/packaging/components${query}`);
    },
    createComponent: async (data: PackagingComponentCreateInput): Promise<PackagingComponent> => {
      return await api.post<PackagingComponent>("/packaging/components", data);
    },
    updateComponent: async (ulid: string, data: PackagingComponentUpdateInput): Promise<PackagingComponent> => {
      return await api.put<PackagingComponent>(`/packaging/components/${ulid}`, data);
    },
    deleteComponent: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/packaging/components/${ulid}`);
    },
  }
);
