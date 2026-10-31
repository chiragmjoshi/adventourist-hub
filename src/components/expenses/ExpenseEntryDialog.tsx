import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ExpenseEntry, ExpenseEntryInput, useUpsertExpenseEntry,
} from "@/hooks/useExpenseEntries";

/**
 * Phase E2 — add / edit an expense_entries row.
 *
 * The recurring toggle sets is_recurring=true on save; the trigger that
 * materialises 11 future rows per the shared recurring_group_id lands
 * in Phase E3. For now, enabling the toggle just marks the row — the
 * copy makes that explicit.
 */

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ExpenseEntry | null;
  /** Default entry_date when adding (parent passes the selected month's first day). */
  defaultEntryDate?: string;
};

function emptyForm(defaultDate?: string): ExpenseEntryInput {
  return {
    entry_date: defaultDate || format(new Date(), "yyyy-MM-dd"),
    head: "",
    sub_head: "",
    amount: 0,
    is_recurring: false,
    notes: null,
  };
}

function fromExisting(e: ExpenseEntry): ExpenseEntryInput {
  return {
    entry_date: e.entry_date,
    head: e.head,
    sub_head: e.sub_head ?? "",
    amount: Number(e.amount),
    is_recurring: e.is_recurring,
    notes: e.notes,
  };
}

export default function ExpenseEntryDialog({ open, onOpenChange, initial, defaultEntryDate }: Props) {
  const editing = Boolean(initial);
  const [form, setForm] = useState<ExpenseEntryInput>(() => emptyForm(defaultEntryDate));

  useEffect(() => {
    if (open) setForm(initial ? fromExisting(initial) : emptyForm(defaultEntryDate));
  }, [open, initial, defaultEntryDate]);

  const { data: heads = [] } = useQuery({
    queryKey: ["master-values", "expense_head"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("master_values")
        .select("value")
        .eq("type", "expense_head")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []).map((d: { value: string }) => d.value);
    },
  });

  const upsert = useUpsertExpenseEntry();

  const canSubmit =
    form.head.trim().length > 0 &&
    (form.sub_head ?? "").trim().length > 0 &&
    form.entry_date.length > 0 &&
    form.amount > 0 &&
    !upsert.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await upsert.mutateAsync({ id: initial?.id, input: form });
      toast.success(editing ? "Expense updated" : "Expense added");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save expense");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
          <DialogDescription>
            Back-dated entries are allowed — use any date. Rows show in the month their date lands in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-head">Head</Label>
            <Select value={form.head} onValueChange={(v) => setForm({ ...form, head: v })}>
              <SelectTrigger id="exp-head">
                <SelectValue placeholder="Pick a head" />
              </SelectTrigger>
              <SelectContent>
                {heads.length === 0 ? (
                  <SelectItem value="__empty__" disabled>No heads configured</SelectItem>
                ) : heads.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-sub">Sub-head</Label>
            <Input
              id="exp-sub"
              placeholder="e.g. Priya salary · Office electricity · Supabase Pro"
              value={form.sub_head ?? ""}
              onChange={(e) => setForm({ ...form, sub_head: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount">Amount (₹)</Label>
              <Input
                id="exp-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={100}
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 border border-border rounded-md p-3">
            <Switch
              id="exp-recurring"
              checked={form.is_recurring ?? false}
              onCheckedChange={(v) => setForm({ ...form, is_recurring: v })}
            />
            <div className="flex-1">
              <Label htmlFor="exp-recurring" className="text-sm font-medium cursor-pointer">
                Recurring monthly
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Full auto-expansion to 11 future months lands in Phase E3. Toggling it on
                today still flags the row — just doesn't duplicate yet.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-notes">Notes</Label>
            <Textarea
              id="exp-notes"
              rows={2}
              placeholder="Invoice ref, vendor, context…"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Add expense"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
