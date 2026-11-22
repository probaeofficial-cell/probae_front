import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createDocumentsApi = (api: ApiClient) => (
  {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return await api.post<{ id: number; filename: string; content_type: string; size_bytes: number; created_at: string }>("/documents/upload", formData);
    },
  }
);
