import { useAuth } from "@/contexts/AuthContext";

type Role = "super_admin" | "admin" | "sales" | "operations" | "finance";

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  admin: [
    "leads", "itineraries", "landing_pages", "trip_cashflow", "vendors",
    "reports", "reports_sales", "reports_revenue", "reports_conversion",
    "reports_destinations", "reports_platform_roi", "reports_team",
    "db_management", "settings",
  ],
  sales: [
    "leads", "itineraries", "landing_pages", "reports", "reports_sales",
    "reports_conversion", "reports_destinations",
  ],
  operations: [
    "leads", "itineraries", "vendors", "trip_cashflow",
    "reports", "reports_sales", "reports_revenue", "reports_destinations",
    "db_management",
  ],
  finance: [
    "trip_cashflow", "reports", "reports_revenue", "reports_conversion",
  ],
};

export const useRBAC = () => {
  const { profile } = useAuth();
  const role = (profile?.role ?? "sales") as Role;

  const hasPermission = (permission: string) => {
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes("*") || perms.includes(permission);
  };

  const hasRole = (...roles: Role[]) => roles.includes(role);

  return { role, hasPermission, hasRole };
};

export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/reports/revenue": ["finance", "admin", "super_admin"],
  "/reports/platform-roi": ["admin", "super_admin"],
  "/reports/team": ["admin", "super_admin"],
  "/user-management": ["super_admin"],
  "/role-management": ["super_admin"],
  "/settings": ["super_admin"],
  "/trip-cashflow": ["operations", "admin", "super_admin", "finance"],
};
