import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  tomorrowAt, todayAt, inHours, inDaysAt, fromDateAt,
  fullDateLabel, toDateTimeLocal,
} from "@/lib/reminderHelpers";

type Lead = {
  id: string;
  name?: string | null;
  travel_date?: string | null;
  destinations?: { name?: string | null } | null;
  itineraries?: { headline?: string | null; nights?: number | null } | null;
  // nights is sometimes on the itinerary join, sometimes resolved separately
  itinerary_nights?: number | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

type Chip = {
  key: string;
  label: string;
  type: "follow_up" | "call_back" | "trip_start" | "trip_end" | "manual";
  when: () => Date;
  buildTitle: (l: Lead) => string;
};

export default function AddReminderModal({ open, onOpenChange, lead }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();

  const destName = lead.destinations?.name || "the destination";
  const nights =
    (lead as any).itinerary_nights ??
    lead.itineraries?.nights ??
    null;
  const hasTravel = !!lead.travel_date;
  const hasNights = hasTravel && typeof nights === "number" && nights > 0;

  const chips: Chip[] = useMemo(() => {
    const base: Chip[] = [
      {
        key: "ft", label: "📞 Follow-up tomorrow", type: "follow_up",
        when: () => tomorrowAt(10),
        buildTitle: (l) => `Follow up with ${l.name || "lead"}`,
      },
      {
        key: "cb2", label: "📞 Call back in 2 hours", type: "call_back",
        when: () => inHours(2),
        buildTitle: (l) => `Call back ${l.name || "lead"}`,
      },
      {
        key: "cb5", label: "📞 Call back today 5 PM", type: "call_back",
        when: () => todayAt(17),
        buildTitle: (l) => `Call back ${l.name || "lead"}`,
      },
      {
        key: "fw", label: "📞 Follow-up next week", type: "follow_up",
        when: () => inDaysAt(7, 10),
        buildTitle: (l) => `Follow up with ${l.name || "lead"}`,
      },
    ];
    if (hasTravel) {
      base.push({
        key: "ts", label: "✈️ Trip start day", type: "trip_start",
        when: () => fromDateAt(lead.travel_date!, 8),
        buildTitle: (l) =>
          `Trip starts today — ${l.name || "lead"} travelling to ${destName}`,
      });
      if (hasNights) {
        base.push({
          key: "te", label: "🏠 Trip return day", type: "trip_end",
          when: () => fromDateAt(lead.travel_date!, 10, 0, nights as number),
          buildTitle: (l) =>
            `Trip ends today — ${l.name || "lead"} returns from ${destName}`,
        });
        base.push({
          key: "rv", label: "⭐ Review request", type: "manual",
          when: () => fromDateAt(lead.travel_date!, 10, 0, (nights as number) + 2),
          buildTitle: (l) =>
            `Ask ${l.name || "lead"} for review after ${destName} trip`,
        });
      }
    }
    return base;
  }, [lead, destName, hasTravel, hasNights, nights]);

  // Custom form
  const [title, setTitle] = useState("");
  const [whenLocal, setWhenLocal] = useState(toDateTimeLocal(tomorrowAt(10)));
  const [notes, setNotes] = useState("");

  const reset = () => {
    setTitle("");
    setWhenLocal(toDateTimeLocal(tomorrowAt(10)));
    setNotes("");
  };

  const createReminder = useMutation({
    mutationFn: async (input: {
      title: string; due_at: Date; type: string; notes?: string | null;
    }) => {
      const { error } = await supabase.from("reminders" as any).insert({
        lead_id: lead.id,
        created_by: profile?.id || null,
        assigned_to: profile?.id || null,
        title: input.title,
        reminder_type: input.type,
        due_at: input.due_at.toISOString(),
        status: "pending",
        notes: input.notes || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders", "lead", lead.id] });
      qc.invalidateQueries({ queryKey: ["reminders", "due_today"] });
      toast.success(`Reminder set for ${fullDateLabel(vars.due_at)}`);
      reset();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to set reminder"),
  });

  const handleChip = (c: Chip) => {
    const due = c.when();
    createReminder.mutate({
      title: c.buildTitle(lead),
      due_at: due,
      type: c.type,
    });
  };

  const handleCustom = () => {
    if (!title.trim()) return toast.error("Title is required");
    if (!whenLocal) return toast.error("Pick a date & time");
    createReminder.mutate({
      title: title.trim(),
      due_at: new Date(whenLocal),
      type: "manual",
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Reminder</DialogTitle>
          <p className="text-xs text-muted-foreground">For {lead.name || "this lead"}</p>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick add</Label>
          <div className="flex flex-wrap gap-2">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => handleChip(c)}
                disabled={createReminder.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/60 text-xs font-medium bg-background hover:bg-[#FFF5F2] hover:border-blaze hover:text-blaze transition-colors disabled:opacity-50"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative my-1">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            or set custom
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Reminder title <span className="text-destructive">*</span></Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call back after salary credit"
              className="mt-1 rounded-md"
            />
          </div>
          <div>
            <Label className="text-xs">Date & time</Label>
            <Input
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => setWhenLocal(e.target.value)}
              className="mt-1 rounded-md"
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any context…"
              className="mt-1 rounded-md"
            />
          </div>

          <Button
            onClick={handleCustom}
            disabled={createReminder.isPending}
            className="w-full rounded-md text-white"
            style={{ backgroundColor: "hsl(var(--blaze))" }}
          >
            Set Reminder →
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}