import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to postgres_changes on a table and invalidate the given React Query
 * keys whenever any row changes. Used to keep lists in sync without manual refresh.
 */
export function useRealtimeInvalidate(
  table: string,
  keys: QueryKey[],
  opts?: { filter?: string }
) {
  const qc = useQueryClient();
  const keysSig = JSON.stringify(keys);
  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table, ...(opts?.filter ? { filter: opts.filter } : {}) },
        () => {
          keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, opts?.filter, keysSig]);
}
