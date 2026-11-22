import type { api as SharedApiClient } from "../../apiService";
import type { Vendor, VendorCreateInput, VendorUpdateInput, PaginatedVendors } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createVendorsApi = (api: ApiClient) => (
  {
    getVendors: async (page: number, size: number, search?: string, sort?: string): Promise<PaginatedVendors> => {
      let query = `?page=${page}&page_size=${size}`;
      if (search) {
        query += `&search=${encodeURIComponent(search)}`;
      }
      if (sort) {
        query += `&sort=${encodeURIComponent(sort)}`;
      }
      return await api.get<PaginatedVendors>(`/vendors/${query}`);
    },
    getVendor: async (ulid: string): Promise<Vendor> => {
      return await api.get<Vendor>(`/vendors/${ulid}`);
    },
    createVendor: async (data: VendorCreateInput): Promise<Vendor> => {
      return await api.post<Vendor>("/vendors/", data);
    },
    updateVendor: async (ulid: string, data: VendorUpdateInput): Promise<Vendor> => {
      return await api.put<Vendor>(`/vendors/${ulid}`, data);
    },
    deleteVendor: async (ulid: string): Promise<void> => {
      return await api.del<void>(`/vendors/${ulid}`);
    },
  }
);
