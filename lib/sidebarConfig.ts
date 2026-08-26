import {
  Home,
  Calendar,
  Wheat,
  Layers,
  Coffee, // using Coffee or Salad for bowl as fallback if bowl doesn't exist
  Package,
  Box,
  Users,
  CircleUser,
  Settings,
} from "lucide-react";

export type SubMenuItem = {
  label: string;
  dotColor: string;
  badge?: number;
  path?: string;
};

export type MenuItem = {
  label: string;
  icon: React.ElementType;
  badge?: number;
  subItems?: Record<string, SubMenuItem>;
  active?: boolean;
  path?: string;
};

export const MAIN_MENU: Record<string, MenuItem> = {
  dashboard: { label: "Dashboard", icon: Home, path: "/admin/dashboard" },
  rawMaterials: {
    label: "Raw materials",
    icon: Wheat,
    active: true, // For demo purposes, matching the screenshot
    subItems: {
      vendors: { label: "Vendors", dotColor: "bg-purple-500", path: "/admin/raw-materials/vendors" },
      categories: { label: "Categories", dotColor: "bg-blue-500", path: "/admin/raw-materials/categories" },
      costMgt: { label: "Cost MGT", dotColor: "bg-yellow-500", path: "/admin/raw-materials/cost-management" },
      calorieMgt: { label: "Calorie MGT", dotColor: "bg-red-500", path: "/admin/raw-materials/calorie-management" },
      stockMgt: { label: "Stock MGT", dotColor: "bg-green-500", badge: 3, path: "/admin/raw-materials/stock" },
      purchaseHistory: { label: "Purchase History", dotColor: "bg-teal-500", path: "/admin/raw-materials/purchase-history" },
    },
  },
  ingredients: { label: "Components", icon: Layers, path: "/admin/ingredients" },
  bowls: {
    label: "Bowls",
    icon: Coffee,
    subItems: {
      mealCategories: { label: "Meal Slots", dotColor: "bg-green-500", path: "/admin/bowls/meal-categories" },
      categories: { label: "Categories", dotColor: "bg-blue-500", path: "/admin/bowls/categories" },
      list: { label: "Bowl List", dotColor: "bg-purple-500", path: "/admin/bowls" },
    },
  },
  packaging: {
    label: "Packaging",
    icon: Box,
    subItems: {
      components: { label: "Items", dotColor: "bg-orange-500", path: "/admin/packaging/components" },
      bundles: { label: "Packaging Sets", dotColor: "bg-teal-500", path: "/admin/packaging/bundles" },
    },
  },
  planTiers: { label: "Plan Tiers", icon: Calendar, path: "/admin/plans" },
  orders: { label: "Orders", icon: Package, path: "/admin/orders" },
  customers: { label: "Customers", icon: Users, badge: 3, path: "/admin/customers" },
};

export const BOTTOM_MENU: Record<string, MenuItem> = {
  profile: { label: "Profile", icon: CircleUser, path: "/admin/profile" },
  settings: { label: "Settings", icon: Settings, path: "/admin/settings" },
};
