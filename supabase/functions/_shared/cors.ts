// Shared CORS helpers for Supabase edge functions.
//
// Two helpers:
//   adminCorsHeaders(req)  — origin allowlist for admin-only endpoints
//   publicCorsHeaders()     — wildcard, for endpoints that must accept any
//                             origin (public enquiry form, sitemap, etc.)
//
// Kill switches (set as Supabase function secrets, no code change needed):
//   ALLOW_WILDCARD_CORS=true
//       adminCorsHeaders returns the public (wildcard) headers instead.
//       Use as a one-command rollback if locking down CORS breaks a legit
//       integration — flip it on in the Supabase dashboard and redeploy.
//   EXTRA_ALLOWED_ORIGINS=https://foo.example,https://bar.example
//       Comma-separated additions to the admin allowlist. Lets you grant a
//       new host without a code change (and this PR).
//
// Supabase function secrets are reloaded per cold-start, so changes take
// effect on the next invocation after a redeploy.

const DEFAULT_ALLOWED_ORIGINS = [
  "https://adventourist.in",
  "https://www.adventourist.in",
  "https://admin.adventourist.in",
];

const CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const CORS_HEADERS = "authorization, x-client-info, apikey, content-type, x-api-key";

function parseExtra(): string[] {
  const raw = Deno.env.get("EXTRA_ALLOWED_ORIGINS") ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function wildcard() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Vary": "Origin",
  } as const;
}

/**
 * Allowlisted CORS for admin / authenticated endpoints.
 *
 * Returns the actual request origin when it is on the allowlist, which
 * instructs the browser to let credentialed requests through. For unknown
 * origins the function returns NO `Access-Control-Allow-Origin` header,
 * which causes the browser to block the response — the real defence.
 *
 * `Vary: Origin` is set so CDNs cache per-origin responses correctly.
 */
export function adminCorsHeaders(req: Request): Record<string, string> {
  if (Deno.env.get("ALLOW_WILDCARD_CORS") === "true") {
    return wildcard();
  }

  const origin = req.headers.get("origin") ?? "";
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseExtra()]);

  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Vary": "Origin",
  };

  if (allowed.has(origin)) {
    baseHeaders["Access-Control-Allow-Origin"] = origin;
    baseHeaders["Access-Control-Allow-Credentials"] = "true";
  }
  // If origin isn't allowed we deliberately omit Access-Control-Allow-Origin —
  // the browser then blocks the response.

  return baseHeaders;
}

/**
 * Wildcard CORS for endpoints that must accept any origin (public enquiry
 * form, sitemap, CMS reads, etc.). Never send credentialed cookies through
 * these — the wildcard origin disallows credentials by spec.
 */
export function publicCorsHeaders(): Record<string, string> {
  return wildcard();
}
