export const PERMISSIONS = {
  customers: {
    read: "customers:read",
    create: "customers:create",
    update: "customers:update",
  },
  plans: {
    read: "plans:read",
    calculate: "plans:calculate",
    create: "plans:create",
    update: "plans:update",
    delete: "plans:delete",
  },
  inventory: {
    read: "inventory:read",
    update: "inventory:update",
  },
  expenses: {
    read: "expenses:read",
    create: "expenses:create",
    approve: "expenses:approve",
  },
  orders: {
    read: "orders:read",
    create: "orders:create",
    update: "orders:update",
    delete: "orders:delete",
    dispatch: "orders:dispatch",
    markDelivered: "orders:mark_delivered",
  },
} as const;

export type PermissionCode =
  | (typeof PERMISSIONS.orders)[keyof typeof PERMISSIONS.orders]
  | (typeof PERMISSIONS.customers)[keyof typeof PERMISSIONS.customers]
  | (typeof PERMISSIONS.plans)[keyof typeof PERMISSIONS.plans]
  | (typeof PERMISSIONS.inventory)[keyof typeof PERMISSIONS.inventory]
  | (typeof PERMISSIONS.expenses)[keyof typeof PERMISSIONS.expenses];
