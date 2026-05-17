/**
 * Hostname-based gating for the dual-domain setup:
 *   - adventourist.in (+ www) → public site + /admin CMS paths
 *   - admin.adventourist.in   → redirects to the supported /admin CMS path on www
 *
 * Lovable preview hosts and localhost are unrestricted so the editor and
 * local dev keep working as a single combined app.
 */

export const PUBLIC_HOST = "adventourist.in";
export const ADMIN_HOST = "admin.adventourist.in";

export type HostKind = "public" | "admin" | "preview";

export function getHostKind(hostname: string = window.location.hostname): HostKind {
  if (hostname === ADMIN_HOST) return "admin";
  if (hostname === PUBLIC_HOST || hostname === `www.${PUBLIC_HOST}`) return "public";
  return "preview";
}

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * If the current host + path combination is wrong, returns the URL to
 * redirect to. Returns null when no redirect is needed (or on preview).
 */
export function getCrossHostRedirect(
  hostname: string = window.location.hostname,
  pathname: string = window.location.pathname,
  search: string = window.location.search,
  hash: string = window.location.hash,
): string | null {
  const kind = getHostKind(hostname);
  if (kind === "preview") return null;

  const adminPath = isAdminPath(pathname);

  if (kind === "admin") {
    // Keep the CMS on the primary www domain under /admin.
    return `https://www.${PUBLIC_HOST}${adminPath ? pathname : "/admin/login"}${search}${hash}`;
  }

  return null;
}