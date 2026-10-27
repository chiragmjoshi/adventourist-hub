import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  MarketingSpend,
  MarketingSpendInput,
  useUpsertMarketingSpend,
} from "@/hooks/useMarketingSpends";

/**
 * Phase M2 — add / edit a marketing_spends row.
 *
 * Platform options come from master_values.platform (same source the lead
 * creation form uses, so the two always line up). Landing page is optional
 * — leaving it blank means the row attributes platform-wide per M-1.
 */

const UNSET_LANDING_PAGE = "__none__";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: MarketingSpend | null;
};

export default function MarketingSpendDialog({ open, onOpenChange, initial }: Props) {
  const editing = Boolean(initial);
  const [form, setForm] = useState<MarketingSpendInput>(() => emptyForm());

  // Reset the form each time the dialog opens or the `initial` changes.
  useEffect(() => {
    if (open) setForm(initial ? fromExisting(initial) : emptyForm());
  }, [open, initial]);

  const { data: platforms = [] } = useQuery({
    queryKey: ["master-values", "platform"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("master_values")
        .select("value")
        .eq("type", "platform")
        .eq("is_active", true)
        .order("sort_order");
      return (data || []).map((d: { value: string }) => d.value);
    },
  });

  const { data: landingPages = [] } = useQuery({
    queryKey: ["active-landing-pages-picker"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("landing_pages")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return (data || []) as { id: string; name: string }[];
    },
  });

  const upsert = useUpsertMarketingSpend();

  const dateOrderBad =
    form.start_date && form.end_date && new Date(form.end_date) < new Date(form.start_date);
  const canSubmit =
    form.platform.trim().length > 0 &&
    form.start_date.length > 0 &&
    form.end_date.length > 0 &&
    form.amount > 0 &&
    !dateOrderBad &&
    !upsert.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await upsert.mutateAsync({ id: initial?.id, input: form });
      toast.success(editing ? "Marketing spend updated" : "Marketing spend added");
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save marketing spend";
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit marketing spend" : "Add marketing spend"}</DialogTitle>
          <DialogDescription>
            Log an ad campaign's flight period, platform, and amount. Leave the landing page blank
            for platform-wide spend — the ROI report prorates it across every lead whose platform
            matches, in the overlap window.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ms-platform">Platform</Label>
            <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
              <SelectTrigger id="ms-platform">
                <SelectValue placeholder="Pick a platform" />
              </SelectTrigger>
              <SelectContent>
                {platforms.length === 0 ? (
                  <SelectItem value="__empty__" disabled>No platforms in master values</SelectItem>
                ) : (
                  platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ms-landing">Landing page (optional)</Label>
            <Select
              value={form.landing_page_id ?? UNSET_LANDING_PAGE}
              onValueChange={(v) =>
                setForm({ ...form, landing_page_id: v === UNSET_LANDING_PAGE ? null : v })
              }
            >
              <SelectTrigger id="ms-landing">
                <SelectValue placeholder="Platform-wide (no specific page)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNSET_LANDING_PAGE}>— None (platform-wide) —</SelectItem>
                {landingPages.map((lp) => (
                  <SelectItem key={lp.id} value={lp.id}>{lp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-start">Start date</Label>
            <Input
              id="ms-start"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-end">End date</Label>
            <Input
              id="ms-end"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              aria-invalid={dateOrderBad ? "true" : "false"}
            />
            {dateOrderBad && (
              <p className="text-xs text-destructive">End date must be on or after start date.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ms-amount">Amount (₹)</Label>
            <Input
              id="ms-amount"
              type="number"
              inputMode="numeric"
              min={0}
              step={100}
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ms-campaign">Campaign name</Label>
            <Input
              id="ms-campaign"
              placeholder="e.g. Diwali 2026"
              value={form.campaign_name ?? ""}
              onChange={(e) => setForm({ ...form, campaign_name: e.target.value || null })}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ms-adgroup">Ad group</Label>
            <Input
              id="ms-adgroup"
              placeholder="e.g. Ladakh adventure travellers"
              value={form.ad_group ?? ""}
              onChange={(e) => setForm({ ...form, ad_group: e.target.value || null })}
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="ms-notes">Notes</Label>
            <Textarea
              id="ms-notes"
              rows={2}
              placeholder="Internal notes — audience, A/B test, invoice ref…"
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
            {upsert.isPending ? "Saving…" : editing ? "Save changes" : "Add spend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function emptyForm(): MarketingSpendInput {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    start_date: today,
    end_date: today,
    platform: "",
    landing_page_id: null,
    campaign_name: null,
    ad_group: null,
    amount: 0,
    notes: null,
  };
}

function fromExisting(s: MarketingSpend): MarketingSpendInput {
  return {
    start_date: s.start_date,
    end_date: s.end_date,
    platform: s.platform,
    landing_page_id: s.landing_page_id,
    campaign_name: s.campaign_name,
    ad_group: s.ad_group,
    amount: Number(s.amount),
    notes: s.notes,
  };
}
