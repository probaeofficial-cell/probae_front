// ─── Shared API Types ────────────────────────────────────────────────────────
// Put all your API response and payload interfaces here.

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  // ... other user fields
}

// export interface Product {
//   id: string;
//   name: string;
//   price: number;
// }
