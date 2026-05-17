import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * One-shot database health ping. Logs latency to the console and surfaces a
 * toast if the database is unreachable or responding slowly (> 3s).
 */
export function useDBHealthCheck() {
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
          return;
        }
        if (latency > 3000) {
          console.warn(`[DB] Slow response: ${latency}ms`);
          toast.warning("Database responding slowly. You may experience delays.", {
            duration: 6000,
          });
        } else {
          console.log(`[DB] Connected ✓ (${latency}ms)`);
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[DB] Health check threw:", e);
        toast.error("Database connection issue. Please refresh the page.", {
          duration: 10000,
        });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);
}

export default useDBHealthCheck;
