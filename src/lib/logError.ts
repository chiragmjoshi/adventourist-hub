import { supabase } from "@/integrations/supabase/client";

interface LogErrorInput {
  error: unknown;
  componentStack?: string | null;
  scope?: string;
  context?: Record<string, unknown>;
}

type Environment = "production" | "staging" | "preview" | "development" | "unknown";

function detectEnvironment(): Environment {
  if (import.meta.env.DEV) return "development";
  if (typeof window === "undefined") return "unknown";
  const host = window.location.hostname;
  if (host.endsWith("adventourist.in")) return "production";
  if (host.includes("staging")) return "staging";
  if (host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com")) return "preview";
  return "unknown";
}

function normalizeError(error: unknown): { message: string; name: string; stack: string | null } {
  if (error instanceof Error) {
    return { message: error.message, name: error.name || "Error", stack: error.stack ?? null };
  }
  try {
    return { message: String(error), name: "NonError", stack: null };
  } catch {
    return { message: "Unknown error (unstringifiable)", name: "NonError", stack: null };
  }
}

/**
 * Record a client-side exception into public.error_logs.
 *
 * Non-blocking: callers do not await this. Failures are swallowed on purpose
 * — a logging failure must never cascade into another error.
 *
 * No-op when the user is not authenticated (public visitors). The RLS policy
 * on error_logs only allows authenticated inserts; attempting anon writes
 * would fail silently anyway, so we skip them to save a round trip.
 */
export function logError(input: LogErrorInput): void {
  const { message, name, stack } = normalizeError(input.error);

  // Always log to console so dev + Lovable preview still show the error.
  console.error(`[${input.scope ?? "app"}]`, input.error, input.componentStack ?? "");

  void (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await supabase.from("error_logs" as never).insert({
        user_id: session.user.id,
        route: typeof window !== "undefined" ? window.location.pathname : null,
        url: typeof window !== "undefined" ? window.location.href : null,
        message,
        name,
        stack,
        component_stack: input.componentStack ?? null,
        scope: input.scope ?? null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        release_sha: (import.meta.env.VITE_RELEASE_SHA as string | undefined) ?? null,
        environment: detectEnvironment(),
        context: input.context ?? null,
      });
    } catch {
      // Never let logging failures bubble.
    }
  })();
}
