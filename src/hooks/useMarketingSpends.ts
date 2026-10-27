import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase M2 — marketing_spends CRUD hooks.
 *
 * The table and its RLS perimeter ship in migration
 * 20261027120000_marketing_spends.sql. Admin + super_admin only can write;
 * all authenticated users read (so M3's ROI aggregates work for every RM).
 *
 * Supabase types for the new table aren't in the generated types yet; the
 * `as never` casts bypass that without `any`. We regenerate types in a
 * separate PR so types-only churn doesn't bloat this one.
 */

export interface MarketingSpend {
  id: string;
  start_date: string;
  end_date: string;
  platform: string;
  landing_page_id: string | null;
  campaign_name: string | null;
  ad_group: string | null;
  amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSpendInput {
  start_date: string;
  end_date: string;
  platform: string;
  landing_page_id?: string | null;
  campaign_name?: string | null;
  ad_group?: string | null;
  amount: number;
  notes?: string | null;
}

const LIST_KEY = ["marketing_spends"] as const;

export function useMarketingSpends() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: async (): Promise<MarketingSpend[]> => {
      const { data, error } = await supabase
        .from("marketing_spends" as never)
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as MarketingSpend[];
    },
  });
}

export function useUpsertMarketingSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: MarketingSpendInput }) => {
      const payload = {
        start_date: input.start_date,
        end_date: input.end_date,
        platform: input.platform,
        landing_page_id: input.landing_page_id ?? null,
        campaign_name: input.campaign_name ?? null,
        ad_group: input.ad_group ?? null,
        amount: input.amount,
        notes: input.notes ?? null,
      };
      if (id) {
        const { error } = await supabase
          .from("marketing_spends" as never)
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("marketing_spends" as never)
          .insert({ ...payload, created_by: userRes?.user?.id ?? null } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useDeleteMarketingSpend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketing_spends" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  });
}
