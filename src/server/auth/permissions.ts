export const staffRoleValues = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "KITCHEN",
  "RIDER",
  "MENU_EDITOR",
  "SUPPORT",
  "SYSTEM_ADMIN",
] as const;

export type StaffRole = (typeof staffRoleValues)[number];

type Capability =
  | "orders:view"
  | "orders:update"
  | "orders:cancel"
  | "orders:create_manual"
  | "menu:edit"
  | "reports:view"
  | "staff:manage"
  | "settings:edit"
  | "audit:view";

const roleCapabilities: Record<StaffRole, Capability[]> = {
  OWNER: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "orders:create_manual",
    "menu:edit",
    "reports:view",
    "staff:manage",
    "settings:edit",
    "audit:view",
  ],
  MANAGER: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "orders:create_manual",
    "menu:edit",
    "reports:view",
    "settings:edit",
  ],
  CASHIER: ["orders:view", "orders:update", "orders:create_manual"],
  KITCHEN: ["orders:view", "orders:update"],
  RIDER: ["orders:view", "orders:update"],
  MENU_EDITOR: ["menu:edit"],
  SUPPORT: ["orders:view"],
  SYSTEM_ADMIN: [
    "orders:view",
    "orders:update",
    "orders:cancel",
    "orders:create_manual",
    "menu:edit",
    "reports:view",
    "staff:manage",
    "settings:edit",
    "audit:view",
  ],
};

export function can(role: StaffRole, capability: Capability) {
  return roleCapabilities[role].includes(capability);
}

export function canAccessAdminPath(role: StaffRole, pathname: string) {
  if (pathname.startsWith("/admin/staff")) return can(role, "staff:manage");
  if (pathname.startsWith("/admin/reports")) return can(role, "reports:view");
  if (pathname.startsWith("/admin/settings")) return can(role, "settings:edit");
  if (pathname.startsWith("/admin/audit")) return can(role, "audit:view");
  if (pathname.startsWith("/admin/orders/new")) return can(role, "orders:create_manual");
  if (pathname.startsWith("/admin/menu")) return can(role, "menu:edit");
  if (pathname.startsWith("/admin/kitchen")) return ["OWNER", "MANAGER", "KITCHEN"].includes(role);
  return can(role, "orders:view");
}
