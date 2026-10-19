import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * React hook: is a feature flag enabled for the current user?
 *
 * Backed by the SECURITY DEFINER function `public.is_feature_enabled` so the
 * same resolution rules (per-user allowlist > role allowlist > global >
 * percentage rollout) apply client-side and server-side.
 *
 * Returns false while loading and if the key is unknown. This is the safe
 * default: dark features stay dark on cold loads and on errors.
 *
 *   const quotesEnabled = useFlag("feature:quotes");
 *   if (!quotesEnabled) return null;
 *
 * The hook caches for 5 minutes via React Query; invalidate with
 * `queryClient.invalidateQueries({ queryKey: ["feature-flag", key] })` after
 * super-admin flag changes if you need an immediate flip without reload.
 */
export function useFlag(key: string): boolean {
  const { data } = useQuery({
    queryKey: ["feature-flag", key],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_feature_enabled" as never, {
        p_key: key,
      } as never);
      if (error) {
        // Treat as disabled on error — safer default than throwing.
        return false;
      }
      return Boolean(data);
    },
  });
  return Boolean(data);
}

/**
 * Non-React resolver, for use inside services / event handlers that run
 * outside the React tree (e.g. the automation engine). Returns a Promise
 * that resolves to the boolean verdict. Safe default: false on any error.
 */
export async function isFeatureEnabled(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_feature_enabled" as never, {
      p_key: key,
    } as never);
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}
