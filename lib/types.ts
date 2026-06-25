// ─── Shared API Types ────────────────────────────────────────────────────────
// Put all your API response and payload interfaces here.

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface Document {
  id: number;
  ulid: string;
  filename: string;
  file_url?: string;
}

export interface UserProfile {
  id: string | number;
  ulid?: string;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  full_name?: string | null;
  profile_picture?: Document | null;
}

// ─── Raw Material Category Types ────────────────────────────────────────────────
export interface RawMaterialCategory {
  id: number;
  ulid: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RawMaterialCategoryCreateInput {
  name: string;
  description?: string | null;
}

export interface RawMaterialCategoryUpdateInput {
  name?: string;
  description?: string | null;
}

export interface PaginatedRawMaterialCategories {
  items: RawMaterialCategory[];
  total: number;
  page: number;
  size: number;
}

// ─── Raw Material Types ──────────────────────────────────────────────────────
export type UnitType = "kg" | "l" | "g" | "ml";

export interface RawMaterial {
  id: number;
  ulid: string;
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
  category?: RawMaterialCategory | null;
  current_stock: number;
  stock_threshold: number;
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
  category_ulid?: string | null;
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
  category_ulid?: string | null;
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

// ─── Ingredient Types ────────────────────────────────────────────────────────

export interface RawMaterialWeightInput {
  raw_material_id: number;
  weight_g_or_ml: number;
}

export interface IngredientRawMaterialResponse {
  id: number;
  raw_material_id: number;
  weight_g_or_ml: number;
}

export interface Ingredient {
  id: number;
  ulid: string;
  code?: string;
  name: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
  total_weight: number;
  total_price: number;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  created_at: string;
  updated_at: string;
  raw_materials: IngredientRawMaterialResponse[];
}

export interface IngredientCreateInput {
  code?: string;
  name: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
  raw_materials: RawMaterialWeightInput[];
}

export interface IngredientUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
  raw_materials?: RawMaterialWeightInput[];
}

export interface PaginatedIngredients {
  items: Ingredient[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

