import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyDateLabel, toDateTimeLocal } from "@/lib/reminderHelpers";

interface Props { leadId: string }

export default function LeadReminderStrip({ leadId }: Props) {
  const qc = useQueryClient();
  const { profile } = useAuth();
  const [editing, setEditing] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editWhen, setEditWhen] = useState("");

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", "lead", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders" as any)
        .select("id, title, due_at, reminder_type, status")
        .eq("lead_id", leadId)
        .eq("status", "pending")
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!leadId,
  });

  const markDone = useMutation({
    mutationFn: async (r: any) => {
      const { error } = await supabase
        .from("reminders" as any)
        .update({ status: "done", done_at: new Date().toISOString() } as any)
        .eq("id", r.id);
      if (error) throw error;
      // log to timeline
      await supabase.from("lead_timeline").insert({
        lead_id: leadId,
        actor_id: profile?.id || null,
        event_type: "reminder_done",
        note: `Reminder completed: ${r.title}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", "lead", leadId] });
      qc.invalidateQueries({ queryKey: ["reminders"] });
      qc.invalidateQueries({ queryKey: ["reminders", "due_today"] });
      qc.invalidateQueries({ queryKey: ["lead_timeline", leadId] });
      toast.success("Reminder completed");
    },
    onError: () => toast.error("Failed to update reminder"),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { error } = await supabase
        .from("reminders" as any)
        .update({
          title: editTitle.trim() || editing.title,
          due_at: editWhen ? new Date(editWhen).toISOString() : editing.due_at,
        } as any)
        .eq("id", editing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reminders", "lead", leadId] });
      qc.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder updated");
      setEditing(null);
    },
    onError: () => toast.error("Failed to update reminder"),
  });

  if (!reminders.length) return null;

  const openEdit = (r: any) => {
    setEditing(r);
    setEditTitle(r.title || "");
    setEditWhen(toDateTimeLocal(new Date(r.due_at)));
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border border-amber-300/60 bg-amber-50/60 overflow-x-auto">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 pr-1">
          <Bell className="h-3.5 w-3.5 text-amber-600" />
          Reminders:
        </span>
        {reminders.map((r: any) => {
          const short = r.title.length > 22 ? r.title.slice(0, 20) + "…" : r.title;
          return (
            <div
              key={r.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-amber-200 text-xs shrink-0 hover:border-amber-400 transition-colors"
            >
              <button
                onClick={() => openEdit(r)}
                className="flex items-center gap-1.5 hover:text-blaze"
                title={r.title}
              >
                <Bell className="h-3 w-3 text-amber-600" />
                <span className="font-medium">{short}</span>
                <span className="text-muted-foreground">· {friendlyDateLabel(r.due_at)}</span>
              </button>
              <button
                onClick={() => markDone.mutate(r)}
                disabled={markDone.isPending}
                title="Mark done"
                className="ml-1 p-0.5 rounded hover:bg-green-100 text-green-700 disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Edit reminder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1 rounded-md" />
            </div>
            <div>
              <Label className="text-xs">Date & time</Label>
              <Input type="datetime-local" value={editWhen} onChange={(e) => setEditWhen(e.target.value)} className="mt-1 rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending} className="text-white" style={{ backgroundColor: "hsl(var(--blaze))" }}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}