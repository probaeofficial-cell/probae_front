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

// ─── Raw Material Types ──────────────────────────────────────────────────────
export type UnitType = "kg" | "l" | "g" | "ml";

export interface RawMaterial {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  unit: UnitType;
  image_filename?: string | null;
  background_image_filename?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  fat: number;
  micros: string[];
  created_at: string;
  updated_at: string;
}

export interface RawMaterialCreateInput {
  name: string;
  description?: string | null;
  price: number;
  unit: UnitType;
  image_filename?: string | null;
  background_image_filename?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fiber?: number;
  fat?: number;
  micros?: string[];
}

export interface RawMaterialUpdateInput {
  name?: string;
  description?: string | null;
  price?: number;
  unit?: UnitType;
  image_filename?: string | null;
  background_image_filename?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fiber?: number;
  fat?: number;
  micros?: string[];
}

export interface PaginatedRawMaterials {
  items: RawMaterial[];
  total: number;
  page: number;
  size: number;
}

export interface MacrosUpdatePayload {
  calories: number;
  protein: number;
  carbs: number;
  fiber: number;
  fat: number;
  micros: string[];
}

// export interface Product {
//   id: string;
//   name: string;
//   price: number;
// }
