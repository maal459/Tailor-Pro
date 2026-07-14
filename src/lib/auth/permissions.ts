export const ALL_PERMISSIONS = [
  "dashboard.view",
  "customers.manage",
  "measurements.manage",
  "orders.manage",
  "payments.manage",
  "reports.view",
  "ledger.view",
  "receipts.view",
  "settings.manage",
  "expenses.manage",
  "employees.manage",
  "suppliers.manage",
  "products.manage",
  "purchases.manage",
  "users.manage"
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_PRESETS: Record<string, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  manager: [
    "dashboard.view",
    "customers.manage",
    "measurements.manage",
    "orders.manage",
    "payments.manage",
    "reports.view",
    "ledger.view",
    "receipts.view",
    "settings.manage",
    "expenses.manage",
    "employees.manage",
    "suppliers.manage",
    "products.manage",
    "purchases.manage"
  ],
  accountant: [
    "dashboard.view",
    "customers.manage",
    "payments.manage",
    "reports.view",
    "ledger.view",
    "receipts.view",
    "expenses.manage",
    "employees.manage",
    "purchases.manage"
  ],
  tailor: [
    "dashboard.view",
    "customers.manage",
    "measurements.manage",
    "orders.manage",
    "receipts.view"
  ],
  viewer: ["dashboard.view", "reports.view", "ledger.view", "receipts.view"]
};

export function getPermissionsForRole(role: string) {
  return ROLE_PRESETS[role] ?? ROLE_PRESETS.viewer;
}

export function hasPermission(permissions: string[] | null | undefined, permission: Permission) {
  return !!permissions?.includes(permission);
}
