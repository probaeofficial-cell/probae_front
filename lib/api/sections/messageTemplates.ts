import type { api as SharedApiClient } from "../../apiService";

type ApiClient = typeof SharedApiClient;

export const createMessageTemplatesApi = (api: ApiClient) => (
  {
    variables: async () => api.get('/message-templates/variables'),
    list: async () => api.get('/message-templates/'),
    get: async (ulid: string) => api.get(`/message-templates/${ulid}`),
    create: async (data: any) => api.post('/message-templates/', data),
    update: async (ulid: string, data: any) => api.patch(`/message-templates/${ulid}`, data),
    delete: async (ulid: string) => api.delete(`/message-templates/${ulid}`)
  }
);
