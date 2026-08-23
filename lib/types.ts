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

// ─── Vendor Types ──────────────────────────────────────────────────────────────
export interface Vendor {
  id: number;
  ulid: string;
  code: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorCreateInput {
  name: string;
  description?: string | null;
}

export interface VendorUpdateInput {
  name?: string;
  description?: string | null;
}

export interface PaginatedVendors {
  items: Vendor[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
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
  standard_price?: number | null;
  actual_price?: number | null;
  yield_grams?: number | null;
  yield_percentage?: number | null;
  previous_price?: number | null;
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
  vendor?: Vendor | null;
  current_stock: number;
  stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface UserMini {
  id: number;
  full_name?: string | null;
  email: string;
}

export interface StockLog {
  ulid: string;
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  description?: string | null;
  created_at: string;
  created_by?: UserMini | null;
}

export interface RawMaterialCreateInput {
  name: string;
  description?: string | null;
  price: number;
  standard_price?: number | null;
  actual_price?: number | null;
  yield_grams?: number | null;
  yield_percentage?: number | null;
  previous_price?: number | null;
  unit: UnitType;
  image_filename?: string | null;
  background_image_filename?: string | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  fat?: number | null;
  micros?: string[] | null;
  category_ulid?: string | null;
  vendor_ulid?: string | null;
}

export interface RawMaterialUpdateInput {
  name?: string;
  description?: string | null;
  price?: number;
  standard_price?: number | null;
  actual_price?: number | null;
  yield_grams?: number | null;
  yield_percentage?: number | null;
  previous_price?: number | null;
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
  vendor_ulid?: string | null;
}

export interface CostLog {
  ulid: string;
  previous_standard_price?: number | null;
  new_standard_price?: number | null;
  previous_actual_price?: number | null;
  new_actual_price?: number | null;
  previous_yield_grams?: number | null;
  new_yield_grams?: number | null;
  created_at: string;
  created_by?: UserMini | null;
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

export interface Bowl {
  id: number;
  ulid: string;
  code?: string;
  name: string;
  category_id: number;
}

export interface BowlCategory {
  id: number;
  ulid: string;
  code?: string;
  name: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
  created_at: string;
  updated_at: string;
  bowls: Bowl[];
}

export interface BowlCategoryCreateInput {
  code?: string;
  name: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
}

export interface BowlCategoryUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  image_filename?: string;
  background_image_filename?: string;
}

export interface PaginatedBowlCategories {
  items: BowlCategory[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Packaging Types ────────────────────────────────────────────────────────

export interface PackagingComponent {
  id: number;
  ulid: string;
  name: string;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface PackagingComponentCreateInput {
  name: string;
  cost: number;
}

export interface PackagingComponentUpdateInput {
  name?: string;
  cost?: number;
}

export interface PaginatedPackagingComponents {
  items: PackagingComponent[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PackagingItemLink {
  id: number;
  packaging_id: number;
  component_id: number;
  quantity: number;
  component: PackagingComponent;
}

export interface PackagingItemLinkInput {
  component_ulid: string;
  quantity: number;
}

export interface Packaging {
  id: number;
  ulid: string;
  name: string;
  code?: string | null;
  total_cost: number;
  created_at: string;
  updated_at: string;
  components: PackagingItemLink[];
}

export interface PackagingCreateInput {
  name: string;
  code?: string | null;
  components: PackagingItemLinkInput[];
}

export interface PackagingUpdateInput {
  name?: string;
  code?: string | null;
  components?: PackagingItemLinkInput[];
}

export interface PaginatedPackaging {
  items: Packaging[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

// ─── Updated Bowl Types ──────────────────────────────────────────────────────

export type BowlType = "STANDARD" | "CUSTOM";
export type BowlSection = "DRESSING" | "BLENDS" | "ADD_ONS" | "PROTEIN" | "CARB" | "FIBER" | "EXTRA_PROTEIN";

export interface BowlIngredient {
  id: number;
  bowl_id: number;
  ingredient_id: number;
  section_name: BowlSection;
  weight_g_or_ml: number;
  ingredient?: Ingredient;
}

export interface BowlIngredientInput {
  ingredient_id: number;
  section_name: BowlSection;
  weight_g_or_ml: number;
}

export interface Bowl {
  id: number;
  ulid: string;
  code?: string;
  name: string;
  description?: string;
  bowl_type: BowlType;
  status: boolean;
  raw_cost: number;
  fixed_cost: number;
  total_cost: number;
  category_id: number;
  packaging_id?: number | null;
  created_at: string;
  updated_at: string;
  ingredients: BowlIngredient[];
}

export interface BowlCreateInput {
  code?: string;
  name: string;
  description?: string;
  bowl_type: BowlType;
  status?: boolean;
  fixed_cost?: number;
  category_id: number;
  packaging_id?: number | null;
  ingredients: BowlIngredientInput[];
}

export interface BowlUpdateInput {
  code?: string;
  name?: string;
  description?: string;
  bowl_type?: BowlType;
  status?: boolean;
  fixed_cost?: number;
  category_id?: number;
  packaging_id?: number | null;
  ingredients?: BowlIngredientInput[];
}

export interface PaginatedBowls {
  items: Bowl[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface PaginatedCostLogs { items: CostLog[]; total: number; page: number; size: number; }
