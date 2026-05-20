import {
  Home,
  Wheat,
  Layers,
  Coffee, // using Coffee or Salad for bowl as fallback if bowl doesn't exist
  Package,
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
      costMgt: { label: "Cost MGT", dotColor: "bg-yellow-500", path: "/admin/raw-materials/cost" },
      stockMgt: { label: "Stock MGT", dotColor: "bg-green-500", badge: 3, path: "/admin/raw-materials/stock" },
    },
  },
  ingredients: { label: "Ingredients", icon: Layers, path: "/admin/ingredients" },
  bowls: { label: "Bowls", icon: Coffee, path: "/admin/bowls" },
  orders: { label: "Orders", icon: Package, path: "/admin/orders" },
  customers: { label: "Customers", icon: Users, badge: 3, path: "/admin/customers" },
};

export const BOTTOM_MENU: Record<string, MenuItem> = {
  profile: { label: "Profile", icon: CircleUser, path: "/admin/profile" },
  settings: { label: "Settings", icon: Settings, path: "/admin/settings" },
};
