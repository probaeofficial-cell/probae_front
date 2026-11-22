import type { api as SharedApiClient } from "../../apiService";
import type { LoginResponse } from "../../types";

type ApiClient = typeof SharedApiClient;

export const createAuthApi = (
  api: ApiClient,
  setMemoryAccessToken: (token: string | null, rememberMe?: boolean, refreshToken?: string) => void,
  clearTokens: () => void,
) => (
  {
    login: async (payload: { identifier: string; password: string; totp_code?: string }, rememberMe?: boolean): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>("/auth/login", payload);
      setMemoryAccessToken(response.access_token, rememberMe, response.refresh_token);
      return response;
    },
    logout: async () => {
      try {
        await api.post("/auth/logout");
      } catch (e) {
        console.error("Failed to call logout API", e);
      } finally {
        clearTokens();
        if (typeof window !== "undefined") {
          const isDeliveryPath = window.location.pathname.startsWith("/delivery");
          window.location.href = isDeliveryPath ? "/delivery/login" : "/admin/login";
        }
      }
    },
    
    changePassword: async (payload: { current_password: string; new_password: string }) => {
      return await api.post<{ message: string }>("/auth/change-password", payload);
    },
    setup2FA: async () => {
      return await api.post<{ secret: string; qr_code_url: string }>("/auth/setup-2fa");
    },
    disable2FA: async () => {
      return await api.post<{ message: string }>("/auth/disable-2fa");
    },
    verify2FA: async (totp_code: string) => {
      return await api.post<{ success: boolean }>("/auth/verify-2fa", { code: totp_code });
    },
    requestPasswordReset: async (email: string) => {
      return await api.post<any>("/auth/forgot-password", { identifier: email });
    },
    resetPassword: async (email: string, otp: string, new_password: string) => { return await api.post<any>("/auth/reset-password", { email, otp, new_password }); }
  }
);
