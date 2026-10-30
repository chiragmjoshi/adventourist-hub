import { useAuth } from "@/contexts/AuthContext";

export type Role = "super_admin" | "admin" | "sales" | "operations" | "finance";

export const VALID_ROLES = ["super_admin", "admin", "sales", "operations", "finance"] as const;

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  super_admin: ["*"],
  admin: [
    "leads", "itineraries", "landing_pages", "trip_cashflow", "vendors",
    "reports", "reports_sales", "reports_revenue", "reports_conversion",
    "reports_destinations", "reports_platform_roi", "reports_platform_performance",
    "reports_ad_feedback", "reports_team",
    "db_management", "settings", "automations",
    "expenses",
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

/**
 * Resolves the current user's role.
 *
 * Phase 2.1 fix: returns `null` (not `"super_admin"`) when the profile is
 * missing or has an unknown role. The previous fallback silently elevated
 * any user whose public.users row was absent to super_admin — a privilege
 * escalation. Callers must now treat `null` as "no permissions" and the
 * `RoleProtectedRoute` component waits on AuthContext's loading flags
 * before rendering AccessDenied, so there is no flash during profile fetch.
 */
export const useRBAC = () => {
  const { profile } = useAuth();
  const rawRole = profile?.role;

  const role: Role | null =
    rawRole && (VALID_ROLES as readonly string[]).includes(rawRole)
      ? (rawRole as Role)
      : null;

  const hasPermission = (permission: string) => {
    if (!role) return false;
    const perms = ROLE_PERMISSIONS[role] || [];
    return perms.includes("*") || perms.includes(permission);
  };

  const hasRole = (...roles: Role[]) => (role ? roles.includes(role) : false);

  return { role, hasPermission, hasRole };
};

export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/reports/revenue": ["finance", "admin", "super_admin"],
  "/reports/platform-roi": ["admin", "super_admin"],
  "/reports/platform-performance": ["admin", "super_admin"],
  "/reports/ad-feedback": ["admin", "super_admin"],
  "/expenses": ["admin", "super_admin"],
  "/reports/team": ["admin", "super_admin"],
  "/user-management": ["super_admin"],
  "/role-management": ["super_admin"],
  "/settings": ["super_admin"],
  "/trip-cashflow": ["operations", "admin", "super_admin", "finance"],
  "/automations": ["admin", "super_admin"],
};
