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
  Users, Network,
  
  CircleUser,
  Settings,
  Truck,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { PERMISSIONS, type PermissionCode } from "@/lib/permissions";

export type SubMenuItem = {
  label: string;
  dotColor: string;
  badge?: number;
  path?: string;
  roles?: string[];
  permission?: PermissionCode;
};

export type MenuItem = {
  label: string;
  icon: React.ElementType;
  badge?: number;
  subItems?: Record<string, SubMenuItem>;
  active?: boolean;
  path?: string;
  roles?: string[];
  permission?: PermissionCode;
};

export function canAccessMenuItem(
  item: MenuItem | SubMenuItem,
  role: string | null,
  hasPermission: (permission: string) => boolean,
) {
  return (
    (!item.roles || (!!role && item.roles.includes(role))) &&
    (!item.permission || hasPermission(item.permission))
  );
}

export function getAdminLandingPath(
  role: string | null,
  hasPermission: (permission: string) => boolean,
): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role !== "STAFF") return "/admin/profile";
  if (hasPermission(PERMISSIONS.orders.read)) return "/admin/orders";
  if (hasPermission(PERMISSIONS.inventory.read)) return "/admin/raw-materials/stock";
  if (hasPermission(PERMISSIONS.customers.read)) return "/admin/customers";
  if (hasPermission(PERMISSIONS.expenses.read)) return "/admin/expenses/logs";
  return "/admin/profile";
}

export const MAIN_MENU: Record<string, MenuItem> = {
  dashboard: { label: "Dashboard", icon: Home, path: "/admin/dashboard", roles: ["ADMIN"] },
  deliveryDashboard: { label: "Dashboard", icon: Home, path: "/delivery", roles: ["DELIVERY"] },
  rawMaterials: {
    label: "Raw materials",
    icon: Wheat,
    permission: PERMISSIONS.inventory.read,
    subItems: {
      vendors: { label: "Vendors", dotColor: "bg-purple-500", path: "/admin/raw-materials/vendors" },
      categories: { label: "Categories", dotColor: "bg-blue-500", path: "/admin/raw-materials/categories", roles: ["ADMIN"] },
      costMgt: { label: "Cost MGT", dotColor: "bg-yellow-500", path: "/admin/raw-materials/cost-management", roles: ["ADMIN"] },
      calorieMgt: { label: "Calorie MGT", dotColor: "bg-red-500", path: "/admin/raw-materials/calorie-management", roles: ["ADMIN"] },
      stockMgt: { label: "Stock MGT", dotColor: "bg-green-500", badge: 3, path: "/admin/raw-materials/stock", permission: PERMISSIONS.inventory.read },
      purchaseHistory: { label: "Purchase History", dotColor: "bg-teal-500", path: "/admin/raw-materials/purchase-history", permission: PERMISSIONS.inventory.read },
      bulkUpload: { label: "Bulk Upload", dotColor: "bg-indigo-500", path: "/admin/raw-materials/bulk-upload", roles: ["ADMIN"] },
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
  plans: {
    label: "Plans",
    icon: Calendar,
    roles: ["ADMIN"],
    subItems: {
      rotations: { label: "Menu Rotations", dotColor: "bg-blue-500", path: "/admin/plans/menu-blueprint" },
      tiers: { label: "Plan Tiers", dotColor: "bg-purple-500", path: "/admin/plans/builder" },
      bulkUpload: { label: "Bulk Upload", dotColor: "bg-indigo-500", path: "/admin/plans/bulk-upload" },
      calculator: { label: "Price Calculator", dotColor: "bg-emerald-500", path: "/admin/plans/calculator" },
    },
  },
  orders: {
    label: "Orders & KDS",
    icon: Package,
    permission: PERMISSIONS.orders.read,
    subItems: {
      dailyBowls: { label: "Daily Bowls", dotColor: "bg-amber-500", path: "/admin/orders/daily-bowls", roles: ["ADMIN"] },
      daily: { label: "Daily Orders", dotColor: "bg-blue-500", path: "/admin/orders", permission: PERMISSIONS.orders.read },
      procurement: { label: "Daily Purchase", dotColor: "bg-red-500", path: "/admin/kds/procurement", roles: ["ADMIN"] },
      prep: { label: "Kitchen Prep", dotColor: "bg-orange-500", path: "/admin/kds/prep", permission: PERMISSIONS.orders.read },
      assembly: { label: "Bowl Assembly", dotColor: "bg-green-500", path: "/admin/kds/assembly", roles: ["ADMIN"] },
      packaging: { label: "Packaging Prep", dotColor: "bg-teal-500", path: "/admin/kds/packaging", roles: ["ADMIN"] },
      dispatch: { label: "Dispatch Prep", dotColor: "bg-purple-500", path: "/admin/kds/dispatch", roles: ["ADMIN"] },
      delivered: { label: "Dispatch Orders", dotColor: "bg-pink-500", path: "/admin/dispatch", roles: ["ADMIN"] },
    },
  },
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
    permission: PERMISSIONS.expenses.read,
    subItems: {
      dashboard: { label: "Dashboard", dotColor: "bg-purple-500", path: "/admin/expenses/dashboard", roles: ["ADMIN"] },
      settlements: { label: "User Settlements", dotColor: "bg-emerald-500", path: "/admin/expenses/settlements", roles: ["ADMIN"] },
      categories: { label: "Categories", dotColor: "bg-orange-500", path: "/admin/expenses/categories", roles: ["ADMIN"] },
      logs: { label: "Expense Logs", dotColor: "bg-red-500", path: "/admin/expenses/logs", permission: PERMISSIONS.expenses.read },
    },
  },

  messaging: { label: "Templates", icon: MessageSquare, path: "/admin/message-templates", roles: ["ADMIN"] },
  affiliates: { label: "Affiliates", icon: Network, path: "/admin/affiliates", roles: ["ADMIN"] },
  customers: {
    label: "Customers",
    icon: Users,
    permission: PERMISSIONS.customers.read,
    subItems: {
      directory: { label: "Directory", dotColor: "bg-blue-500", path: "/admin/customers", permission: PERMISSIONS.customers.read },
      subscriptions: { label: "Subscriptions", dotColor: "bg-purple-500", path: "/admin/subscriptions", roles: ["ADMIN"] },
      transactions: { label: "Wallet & Transactions", dotColor: "bg-green-500", path: "/admin/customers/transactions", roles: ["ADMIN"] },
      dues: { label: "Dues", dotColor: "bg-red-500", path: "/admin/customers/dues", roles: ["ADMIN"] },
      bulkOrders: { label: "Bulk Legacy Orders", dotColor: "bg-amber-500", path: "/admin/customers/bulk-orders", roles: ["ADMIN"] },
    },
  },
  enquiries: { label: "Enquiries", icon: MessageSquare, path: "/admin/enquiries", roles: ["ADMIN"] },
  accessRoles: { label: "Roles & Permissions", icon: ShieldCheck, path: "/admin/settings/roles", roles: ["ADMIN"] },
};

export const BOTTOM_MENU: Record<string, MenuItem> = {
  profile: { label: "Profile", icon: CircleUser, path: "/admin/profile", roles: ["ADMIN", "STAFF", "DELIVERY"] },
  users: { label: "Staff Management", icon: Users, path: "/admin/users", roles: ["ADMIN"] },
  settings: { label: "Settings", icon: Settings, path: "/admin/settings", roles: ["ADMIN"] },
};
