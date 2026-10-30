import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  FeedbackType, REASON_TYPE_BY_FEEDBACK, useInsertLeadFeedback,
} from "@/hooks/useLeadFeedback";

/**
 * Phase A2 — Feedback capture modal.
 *
 * Opens after a lead's sales_status transitions to one of three
 * terminal states. Both actions skip the save: Skip closes the dialog
 * without writing, Save writes a lead_feedback row and closes. The
 * underlying sales_status change is already persisted by the parent
 * before the dialog opens — this is a strictly additive capture layer.
 */

const COPY: Record<FeedbackType, { title: string; description: string; cta: string }> = {
  invalid_lead: {
    title: "Why was this lead invalid?",
    description:
      "A quick tag helps the ad platform tune its targeting. Takes 10 seconds — or skip.",
    cta: "Save feedback",
  },
  closed_lost: {
    title: "Why did we lose this file?",
    description:
      "Captures why the trip didn't go through. Rolls up into the Ad Feedback report.",
    cta: "Save feedback",
  },
  closed_won: {
    title: "What sealed this trip?",
    description:
      "Positive signal to feed back to the ad platforms. Optional — skip if unsure.",
    cta: "Save feedback",
  },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string | null;
  feedbackType: FeedbackType | null;
};

export default function FeedbackCaptureDialog({ open, onOpenChange, leadId, feedbackType }: Props) {
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    if (open) { setReason(""); setNotes(""); }
  }, [open, feedbackType, leadId]);

  const reasonType = feedbackType ? REASON_TYPE_BY_FEEDBACK[feedbackType] : null;

  const { data: reasons = [], isLoading: reasonsLoading } = useQuery({
    queryKey: ["master-values", reasonType ?? "none"],
    enabled: Boolean(open && reasonType),
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<string[]> => {
      if (!reasonType) return [];
      const { data } = await supabase
        .from("master_values")
        .select("value")
        .eq("type", reasonType)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []).map((d: { value: string }) => d.value);
    },
  });

  const insertFeedback = useInsertLeadFeedback();

  const copy = feedbackType ? COPY[feedbackType] : null;

  const canSave = !!leadId && !!feedbackType && reason.trim().length > 0 && !insertFeedback.isPending;

  const handleSave = async () => {
    if (!canSave || !leadId || !feedbackType) return;
    try {
      await insertFeedback.mutateAsync({
        lead_id: leadId,
        feedback_type: feedbackType,
        reason,
        notes: notes.trim() || null,
      });
      toast.success("Feedback captured");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save feedback");
    }
  };

  const handleSkip = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy?.title ?? "Capture feedback"}</DialogTitle>
          <DialogDescription>{copy?.description ?? ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="fb-reason">Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="fb-reason">
                <SelectValue placeholder={reasonsLoading ? "Loading…" : "Pick a reason"} />
              </SelectTrigger>
              <SelectContent>
                {reasons.length === 0 && !reasonsLoading ? (
                  <SelectItem value="__none__" disabled>No reasons configured — add in Master Values</SelectItem>
                ) : reasons.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-notes">Notes (optional)</Label>
            <Textarea
              id="fb-notes"
              rows={3}
              placeholder="Specific context — e.g. budget was ₹X, said they'd come back in 6 months…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={insertFeedback.isPending}>
            Skip
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {insertFeedback.isPending ? "Saving…" : copy?.cta ?? "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
