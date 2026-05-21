// ─── Shared API Types ────────────────────────────────────────────────────────
// Put all your API response and payload interfaces here.

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface Document {
  id: number;
  filename: string;
  file_url?: string;
}

export interface UserProfile {
  id: string | number;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  full_name?: string | null;
  profile_picture?: Document | null;
}

// export interface Product {
//   id: string;
//   name: string;
//   price: number;
// }
