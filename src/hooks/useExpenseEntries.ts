import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Phase E2 — expense_entries CRUD hooks.
 *
 * Schema in migration 20261030150000_expense_entries.sql.
 * RLS lets anyone authenticated read; is_admin_or_higher() can write.
 * The month_year column auto-syncs from entry_date via a BEFORE trigger,
 * so we never pass it from the client.
 */

export interface ExpenseEntry {
  id: string;
  entry_date: string;
  month_year: string;
  head: string;
  sub_head: string | null;
  amount: number;
  is_recurring: boolean;
  recurring_group_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntryInput {
  entry_date: string;
  head: string;
  sub_head?: string | null;
  amount: number;
  is_recurring?: boolean;
  notes?: string | null;
}

const LIST_KEY = (monthYear: string) => ["expense_entries", monthYear] as const;

/** List rows for a specific YYYY-MM. */
export function useExpenseEntries(monthYear: string | undefined) {
  return useQuery({
    queryKey: monthYear ? LIST_KEY(monthYear) : ["expense_entries", "none"],
    enabled: !!monthYear,
    queryFn: async (): Promise<ExpenseEntry[]> => {
      if (!monthYear) return [];
      const { data, error } = await supabase
        .from("expense_entries" as never)
        .select("*")
        .eq("month_year", monthYear)
        .order("head")
        .order("sub_head", { nullsFirst: false })
        .order("entry_date");
      if (error) throw error;
      return (data || []) as unknown as ExpenseEntry[];
    },
  });
}

export function useUpsertExpenseEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: ExpenseEntryInput }) => {
      const payload = {
        entry_date: input.entry_date,
        head: input.head,
        sub_head: input.sub_head ?? null,
        amount: input.amount,
        is_recurring: input.is_recurring ?? false,
        notes: input.notes ?? null,
      };
      if (id) {
        const { error } = await supabase
          .from("expense_entries" as never)
          .update(payload as never)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase
          .from("expense_entries" as never)
          .insert({ ...payload, created_by: userRes?.user?.id ?? null } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_entries"] }),
  });
}

export function useDeleteExpenseEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_entries"] }),
  });
}

/**
 * Phase E3 — stop a recurring series from a given month onward.
 * Deletes this row + every future row sharing recurring_group_id,
 * leaving past rows intact as historical records.
 */
export function useStopRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { recurringGroupId: string; fromDate: string }) => {
      const { error } = await supabase
        .from("expense_entries" as never)
        .delete()
        .eq("recurring_group_id", args.recurringGroupId)
        .gte("entry_date", args.fromDate);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expense_entries"] }),
  });
}
