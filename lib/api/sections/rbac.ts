import type { api as SharedApiClient } from "../../apiService";
import type { EffectivePermissionsResponse, RbacPermission, RbacRole, RbacRoleDetail } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createRbacApi = (api: ApiClient) => (
  {
    getMyEffectivePermissions: async (): Promise<EffectivePermissionsResponse> => {
      return await api.get<EffectivePermissionsResponse>("/rbac/me/permissions");
    },
    listRoles: async (): Promise<RbacRole[]> => api.get<RbacRole[]>("/rbac/roles"),
    getRole: async (roleUlid: string): Promise<RbacRoleDetail> => api.get<RbacRoleDetail>(`/rbac/roles/${roleUlid}`),
    createRole: async (payload: { name: string; code: string; description?: string | null }): Promise<RbacRole> =>
      api.post<RbacRole>("/rbac/roles", payload),
    updateRole: async (roleUlid: string, payload: { name?: string; description?: string | null }): Promise<RbacRole> =>
      api.patch<RbacRole>(`/rbac/roles/${roleUlid}`, payload),
    deleteRole: async (roleUlid: string): Promise<{ success: boolean; deleted_role: string }> =>
      api.delete<{ success: boolean; deleted_role: string }>(`/rbac/roles/${roleUlid}`),
    listPermissions: async (): Promise<RbacPermission[]> => api.get<RbacPermission[]>("/rbac/permissions"),
    addRolePermissions: async (roleUlid: string, permissionCodes: string[]) =>
      api.post<{ role_ulid: string; assigned_permissions: string[] }>(`/rbac/roles/${roleUlid}/permissions`, { permission_codes: permissionCodes }),
    removeRolePermission: async (roleUlid: string, permissionCode: string) =>
      api.delete<{ role_ulid: string; removed_permission: string }>(`/rbac/roles/${roleUlid}/permissions/${encodeURIComponent(permissionCode)}`),
    assignStaffRole: async (staffUlid: string, roleUlid: string | null) =>
      api.put<{ user_ulid: string; role: RbacRole | null }>(`/rbac/staff/${staffUlid}/role`, { role_ulid: roleUlid }),
  }
);
