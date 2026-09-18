import {
  Wallet,
  Banknote,
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
  Truck,
} from "lucide-react";

export type SubMenuItem = {
  label: string;
  dotColor: string;
  badge?: number;
  path?: string;
  roles?: string[];
};

export type MenuItem = {
  label: string;
  icon: React.ElementType;
  badge?: number;
  subItems?: Record<string, SubMenuItem>;
  active?: boolean;
  path?: string;
  roles?: string[];
};

export const MAIN_MENU: Record<string, MenuItem> = {
  dashboard: { label: "Dashboard", icon: Home, path: "/admin/dashboard", roles: ["ADMIN"] },
  deliveryDashboard: { label: "Dashboard", icon: Home, path: "/delivery", roles: ["DELIVERY"] },
  rawMaterials: {
    label: "Raw materials",
    icon: Wheat,
    roles: ["ADMIN"],
    subItems: {
      vendors: { label: "Vendors", dotColor: "bg-purple-500", path: "/admin/raw-materials/vendors" },
      categories: { label: "Categories", dotColor: "bg-blue-500", path: "/admin/raw-materials/categories" },
      costMgt: { label: "Cost MGT", dotColor: "bg-yellow-500", path: "/admin/raw-materials/cost-management" },
      calorieMgt: { label: "Calorie MGT", dotColor: "bg-red-500", path: "/admin/raw-materials/calorie-management" },
      stockMgt: { label: "Stock MGT", dotColor: "bg-green-500", badge: 3, path: "/admin/raw-materials/stock" },
      purchaseHistory: { label: "Purchase History", dotColor: "bg-teal-500", path: "/admin/raw-materials/purchase-history" },
    },
  },
  ingredients: { label: "Components", icon: Layers, path: "/admin/ingredients", roles: ["ADMIN"] },
  bowls: {
    label: "Bowls",
    icon: Coffee,
    roles: ["ADMIN"],
    subItems: {
      mealCategories: { label: "Meal Slots", dotColor: "bg-green-500", path: "/admin/bowls/meal-categories" },
      categories: { label: "Categories", dotColor: "bg-blue-500", path: "/admin/bowls/categories" },
      list: { label: "Bowl List", dotColor: "bg-purple-500", path: "/admin/bowls" },
    },
  },
  packaging: {
    label: "Packaging",
    icon: Box,
    roles: ["ADMIN"],
    subItems: {
      components: { label: "Items", dotColor: "bg-orange-500", path: "/admin/packaging/components" },
      bundles: { label: "Packaging Sets", dotColor: "bg-teal-500", path: "/admin/packaging/bundles" },
    },
  },
  planTiers: { label: "Plan Tiers", icon: Calendar, path: "/admin/plans", roles: ["ADMIN"] },
  orders: {
    label: "Orders & KDS",
    icon: Package,
    roles: ["ADMIN"],
    subItems: {
      daily: { label: "Daily Orders", dotColor: "bg-blue-500", path: "/admin/orders" },
      procurement: { label: "Daily Purchase", dotColor: "bg-red-500", path: "/admin/kds/procurement" },
      prep: { label: "Kitchen Prep", dotColor: "bg-orange-500", path: "/admin/kds/prep" },
      assembly: { label: "Bowl Assembly", dotColor: "bg-green-500", path: "/admin/kds/assembly" },
      packaging: { label: "Packaging Prep", dotColor: "bg-teal-500", path: "/admin/kds/packaging" },
    },
  },
  transactions: {
    label: "Transactions",
    icon: Banknote,
    roles: ["ADMIN"],
    subItems: {
      dashboard: { label: "Dashboard", dotColor: "bg-blue-500", path: "/admin/transactions/dashboard" },
      logs: { label: "Transaction Logs", dotColor: "bg-purple-500", path: "/admin/transactions/logs" },
    },
  },
  expenses: {
    label: "Expenses",
    icon: Wallet,
    roles: ["ADMIN"],
    subItems: {
      categories: { label: "Categories", dotColor: "bg-orange-500", path: "/admin/expenses/categories" },
      logs: { label: "Expense Logs", dotColor: "bg-red-500", path: "/admin/expenses/logs" },
    },
  },

  customers: { label: "Customers", icon: Users, badge: 3, path: "/admin/customers", roles: ["ADMIN"] },
  delivery: {
    label: "Delivery",
    icon: Truck,
    roles: ["ADMIN"],
    subItems: {
      dashboard: { label: "Dashboard", dotColor: "bg-blue-500", path: "/admin/delivery/dashboard" },
      today: { label: "Delivery Today", dotColor: "bg-orange-500", path: "/admin/delivery/today" },
      zones: { label: "Delivery Zones", dotColor: "bg-purple-500", path: "/admin/delivery/zones" },
      agents: { label: "Delivery Agents", dotColor: "bg-pink-500", path: "/admin/delivery/agents" },
    },
  },
};

export const BOTTOM_MENU: Record<string, MenuItem> = {
  profile: { label: "Profile", icon: CircleUser, path: "/admin/profile", roles: ["ADMIN", "DELIVERY"] },
  settings: { label: "Settings", icon: Settings, path: "/admin/settings", roles: ["ADMIN"] },
};
