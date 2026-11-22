export const queryKeys = {
  private: ["private"] as const,
  auth: {
    currentUser: (userId: string | number) => ["private", "auth", "current-user", userId] as const,
    permissions: (userId: string | number) => ["private", "auth", "permissions", userId] as const,
  },
  settings: {
    root: ["private", "settings"] as const,
    current: (userId: string | number) => ["private", "settings", userId] as const,
  },
  lowStock: {
    root: ["private", "inventory", "low-stock-count"] as const,
    current: (userId: string | number) => ["private", "inventory", "low-stock-count", userId] as const,
  },
  notifications: ["private", "notifications"] as const,
  orders: ["private", "orders"] as const,
  customers: ["private", "customers"] as const,
  inventory: ["private", "inventory"] as const,
  bowls: ["private", "bowls"] as const,
  bowlCatalogue: {
    list: (userId: string | number, params: readonly unknown[]) => ["private", "bowls", userId, ...params] as const,
    categories: (userId: string | number, params: readonly unknown[]) => ["private", "bowl-categories", userId, ...params] as const,
  },
  ingredients: ["private", "ingredients"] as const,
  ingredientCatalogue: {
    list: (userId: string | number, params: readonly unknown[]) => ["private", "ingredients", userId, ...params] as const,
  },
  rawMaterials: {
    root: ["private", "raw-material-catalogue"] as const,
    list: (userId: string | number, params: readonly unknown[]) => ["private", "raw-material-catalogue", userId, ...params] as const,
  },
  packaging: {
    root: ["private", "packaging"] as const,
    list: (userId: string | number, params: readonly unknown[]) => ["private", "packaging", userId, ...params] as const,
    components: (userId: string | number, params: readonly unknown[]) => ["private", "packaging", "components", userId, ...params] as const,
  },
  mealCategories: {
    root: ["private", "meal-categories"] as const,
    list: (userId: string | number, params: readonly unknown[]) => ["private", "meal-categories", userId, ...params] as const,
  },
  plans: ["private", "plans"] as const,
  planTiers: {
    root: ["private", "plan-tiers"] as const,
    list: (userId: string | number, params: readonly unknown[]) => ["private", "plan-tiers", userId, ...params] as const,
  },
  expenses: ["private", "expenses"] as const,
  settlements: ["private", "settlements"] as const,
  publicPlans: {
    root: ["public", "plans"] as const,
    list: (page: number, size: number, category: string) => ["public", "plans", page, size, category] as const,
  },
};
