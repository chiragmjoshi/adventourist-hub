import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DBHealthStatus = "checking" | "connected" | "degraded" | "error";

export interface DBHealthState {
  status: DBHealthStatus;
  latencyMs: number | null;
}

/**
 * One-shot database health ping. Logs latency to the console, surfaces a
 * toast if the database is unreachable or responding slowly (> 3s), and
 * returns the live state so Settings / status widgets can render it.
 *
 * Phase 4A.2: previously the hook returned void and Settings displayed a
 * hard-coded "Connected" badge. Now callers can show the real state —
 * "checking", "connected", "degraded", or "error" — plus latency.
 */
export function useDBHealthCheck(): DBHealthState {
  const [state, setState] = useState<DBHealthState>({
    status: "checking",
    latencyMs: null,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const start = Date.now();
      try {
        const { error } = await supabase
          .from("settings")
          .select("id")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        const latency = Date.now() - start;
        // PGRST116 = no rows returned (treat as healthy)
        if (error && (error as any).code !== "PGRST116") {
          console.error("[DB] Health check failed:", error);
          toast.error("Database connection issue. Please refresh the page.", {
            duration: 10000,
          });
          setState({ status: "error", latencyMs: latency });
          return;
        }
        if (latency > 3000) {
          console.warn(`[DB] Slow response: ${latency}ms`);
          toast.warning("Database responding slowly. You may experience delays.", {
            duration: 6000,
          });
          setState({ status: "degraded", latencyMs: latency });
        } else {
          console.log(`[DB] Connected ✓ (${latency}ms)`);
          setState({ status: "connected", latencyMs: latency });
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[DB] Health check threw:", e);
        toast.error("Database connection issue. Please refresh the page.", {
          duration: 10000,
        });
        setState({ status: "error", latencyMs: null });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export default useDBHealthCheck;
