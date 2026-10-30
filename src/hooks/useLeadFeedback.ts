import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase A2 — lead_feedback CRUD hooks.
 *
 * Schema in migration 20261030140000_lead_feedback.sql. RLS lets anyone
 * authenticated read + insert; only is_admin_or_higher() can
 * update/delete, so history stays trustworthy.
 */

export type FeedbackType = "invalid_lead" | "closed_lost" | "closed_won";

export interface LeadFeedback {
  id: string;
  lead_id: string;
  feedback_type: FeedbackType;
  reason: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const REASON_TYPE_BY_FEEDBACK: Record<FeedbackType, string> = {
  invalid_lead: "invalid_lead_reason",
  closed_lost: "closed_lost_reason",
  closed_won: "closed_won_reason",
};

const KEY = (leadId: string) => ["lead_feedback", leadId] as const;

export function useLeadFeedback(leadId: string | undefined) {
  return useQuery({
    queryKey: leadId ? KEY(leadId) : ["lead_feedback", "none"],
    enabled: !!leadId,
    queryFn: async (): Promise<LeadFeedback[]> => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_feedback" as never)
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LeadFeedback[];
    },
  });
}

export function useInsertLeadFeedback() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      lead_id: string;
      feedback_type: FeedbackType;
      reason: string;
      notes?: string | null;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("lead_feedback" as never).insert({
        lead_id: input.lead_id,
        feedback_type: input.feedback_type,
        reason: input.reason,
        notes: input.notes ?? null,
        created_by: userRes?.user?.id ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: KEY(vars.lead_id) }),
  });
}
