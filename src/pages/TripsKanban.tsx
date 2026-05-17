import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Phone, PhoneCall, Bell, CheckCircle2, Calendar, User, Search, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "trip_sold",              label: "Trip Sold",              color: "hsl(var(--blaze))",   staleDays: 2 },
  { key: "booking_reconfirmation", label: "Booking Reconfirmation", color: "hsl(var(--horizon))", staleDays: 1 },
  { key: "briefing_call",          label: "Briefing Call",          color: "hsl(var(--lagoon))",  staleDays: 3 },
  { key: "on_tour_support",        label: "On Tour Support",        color: "#3b82f6",             staleDays: 1 },
  { key: "feedback_call",          label: "Feedback Call",          color: "#a855f7",             staleDays: 2 },
  { key: "trip_completed",         label: "Trip Completed",         color: "hsl(var(--ridge))",   staleDays: 999 },
];

const nextStage = (s: string) => {
  const idx = STAGES.findIndex((x) => x.key === s);
  return idx >= 0 && idx < STAGES.length - 1 ? STAGES[idx + 1].key : null;
};

type LogCallTarget = { trip: any } | null;
type ReminderTarget = { trip: any } | null;

const TripsKanban = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(true);
  const [logCall, setLogCall] = useState<LogCallTarget>(null);
  const [remind, setRemind] = useState<ReminderTarget>(null);

  const { data: trips = [], isLoading, isError, error: queryError } = useQuery({
    queryKey: ["trips_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_cashflow")
        .select(`
          id,
          cashflow_code,
          traveller_name,
          traveller_code,
          travel_start_date,
          travel_end_date,
          trip_stage,
          status,
          pax_count,
          destination:destinations!destination_id(name),
          assignedUser:users!assigned_to(name)
        `)
        .neq("status", "cancelled")
        .order("travel_start_date", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  // Latest activity per trip from lead_timeline (matches by metadata->trip_id)
  const tripIds = trips.map((t) => t.id);
  const { data: lastActivity = {} } = useQuery({
    queryKey: ["trips_kanban_activity", tripIds.length],
    enabled: tripIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_timeline")
        .select("created_at, event_type, metadata")
        .in("event_type", ["call_logged", "trip_stage_changed", "reminder_set"])
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, { at: string; event: string }> = {};
      (data || []).forEach((row: any) => {
        const tid = row.metadata?.trip_id;
        if (tid && !map[tid]) map[tid] = { at: row.created_at, event: row.event_type };
      });
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (mineOnly && profile?.id && t.assigned_to !== profile.id) return false;
      if (!q) return true;
      return (
        (t.traveller_name || "").toLowerCase().includes(q) ||
        (t.cashflow_code || "").toLowerCase().includes(q) ||
        (t.destinations?.name || "").toLowerCase().includes(q) ||
        (t.leads?.mobile || "").toLowerCase().includes(q)
      );
    });
  }, [trips, search, mineOnly, profile?.id]);

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    STAGES.forEach((s) => (map[s.key] = []));
    filtered
      .filter((t) => !hideCompleted || t.trip_stage !== "trip_completed")
      .forEach((t) => {
        const k = (t.trip_stage && STAGES.find((s) => s.key === t.trip_stage))
          ? t.trip_stage
          : "trip_sold";
        (map[k] = map[k] || []).push(t);
      });
    return map;
  }, [filtered, hideCompleted]);

  const advanceStage = useMutation({
    mutationFn: async ({ trip, target }: { trip: any; target: string }) => {
      const from = trip.trip_stage || "trip_sold";
      const { error } = await supabase
        .from("trip_cashflow")
        .update({ trip_stage: target } as any)
        .eq("id", trip.id);
      if (error) throw error;
      if (trip.lead_id) {
        await supabase.from("lead_timeline").insert({
          lead_id: trip.lead_id,
          event_type: "trip_stage_changed",
          note: `Stage moved: ${from} → ${target}`,
          metadata: { trip_id: trip.id, cashflow_code: trip.cashflow_code, from, to: target },
        });
      }
      return { from };
    },
    onSuccess: (res, vars) => {
      const from = res.from;
      toast.success("Stage advanced", {
        action: {
          label: "Undo",
          onClick: async () => {
            await supabase.from("trip_cashflow").update({ trip_stage: from } as any).eq("id", vars.trip.id);
            queryClient.invalidateQueries({ queryKey: ["trips_kanban"] });
          },
        },
      });
      queryClient.invalidateQueries({ queryKey: ["trips_kanban"] });
      queryClient.invalidateQueries({ queryKey: ["trips_kanban_activity"] });
    },
    onError: () => toast.error("Failed to update stage"),
  });

  return (
    <AppLayout title="Trips Kanban">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Trips Kanban</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Post-sale workflow · {filtered.length} of {trips.length} trips
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search traveller, code, destination…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 w-[280px] text-[13px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="mine" checked={mineOnly} onCheckedChange={setMineOnly} />
            <Label htmlFor="mine" className="text-xs cursor-pointer">Mine only</Label>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={!hideCompleted}
              onChange={(e) => setHideCompleted(!e.target.checked)}
              className="rounded"
            />
            Show completed
          </label>
        </div>
      </div>

      {isError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
          Failed to load trips: {(queryError as any)?.message || "Unknown error"}. Please refresh the page.
        </div>
      )}

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const list = grouped[stage.key] || [];
            const staleCount = list.filter((t) => {
              const last = lastActivity[t.id]?.at || t.updated_at;
              return last && differenceInDays(new Date(), new Date(last)) > stage.staleDays;
            }).length;

            return (
              <div
                key={stage.key}
                className="w-[300px] flex-shrink-0 rounded-lg bg-muted/30 border border-border/50"
              >
                <div
                  className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between sticky top-0 bg-muted/40 backdrop-blur rounded-t-lg"
                  style={{ borderTop: `2px solid ${stage.color}` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {staleCount > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded border-red-300 text-red-600 bg-red-50">
                        {staleCount} idle
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded">{list.length}</Badge>
                  </div>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {isLoading && <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>}
                  {!isLoading && list.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No trips</p>
                  )}
                  {list.map((t) => {
                    const lastAt = lastActivity[t.id]?.at || t.updated_at;
                    const lastEvt = lastActivity[t.id]?.event;
                    const isStale = lastAt && differenceInDays(new Date(), new Date(lastAt)) > stage.staleDays;
                    const next = nextStage(t.trip_stage || "trip_sold");
                    const daysToTravel = t.travel_start_date
                      ? differenceInDays(new Date(t.travel_start_date), new Date())
                      : null;

                    return (
                      <Card
                        key={t.id}
                        onClick={() => navigate(`/admin/trip-cashflow/${t.id}`)}
                        className="p-2.5 cursor-pointer shadow-none border-border/60 hover:border-primary/40 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[13px] font-medium truncate">{t.traveller_name || "—"}</span>
                          {daysToTravel !== null && daysToTravel >= 0 && daysToTravel <= 14 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded border-amber-300 text-amber-700 bg-amber-50 flex-shrink-0">
                              T-{daysToTravel}d
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-primary mt-0.5">{t.cashflow_code}</div>

                        {(() => {
                          if (!t.travel_start_date) return null;
                          const d = differenceInDays(new Date(t.travel_start_date), new Date());
                          if (d < 0) return null;
                          if (d <= 7)
                            return (
                              <Badge className="mt-1 text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-0 rounded">
                                🔴 {d === 0 ? "Today" : `${d}d away`}
                              </Badge>
                            );
                          if (d <= 30)
                            return (
                              <Badge className="mt-1 text-[10px] px-1.5 py-0 bg-[hsl(var(--horizon))]/20 text-[hsl(var(--horizon))] border-0 rounded">
                                🟡 {d}d away
                              </Badge>
                            );
                          return null;
                        })()}

                        {t.destinations?.name && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0 rounded">
                            {t.destinations.name}
                          </Badge>
                        )}

                        {(t.travel_start_date || t.travel_end_date) && (
                          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {t.travel_start_date ? format(new Date(t.travel_start_date), "dd MMM") : "?"}
                            {t.travel_end_date ? ` – ${format(new Date(t.travel_end_date), "dd MMM yyyy")}` : ""}
                            {t.pax_count ? <span className="ml-auto">{t.pax_count} pax</span> : null}
                          </div>
                        )}

                        {t.users?.name && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <User className="h-3 w-3" />{t.users.name}
                          </div>
                        )}

                        <div className={cn(
                          "mt-1.5 text-[10px] flex items-center gap-1",
                          isStale ? "text-red-600 font-medium" : "text-muted-foreground"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", isStale ? "bg-red-500" : "bg-emerald-500")} />
                          {lastAt
                            ? `${lastEvt === "call_logged" ? "Called" : lastEvt === "reminder_set" ? "Reminder" : "Updated"} ${formatDistanceToNow(new Date(lastAt), { addSuffix: true })}`
                            : "No activity"}
                        </div>

                        {/* Quick actions */}
                        <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {t.leads?.mobile ? (
                            <a
                              href={`tel:${t.leads.mobile}`}
                              onClick={() => setLogCall({ trip: t })}
                              className="flex-1"
                            >
                              <Button size="sm" variant="ghost" className="h-7 w-full text-[11px] gap-1 px-1.5 text-[hsl(var(--ridge))] hover:bg-[hsl(var(--ridge))]/10">
                                <Phone className="h-3 w-3" /> Call
                              </Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="ghost" disabled className="h-7 flex-1 text-[11px] gap-1 px-1.5 opacity-40">
                              <Phone className="h-3 w-3" /> No #
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setLogCall({ trip: t })}
                            className="h-7 px-1.5 text-[11px] gap-1"
                            title="Log call"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setRemind({ trip: t })}
                            className="h-7 px-1.5 text-[11px] gap-1"
                            title="Set reminder"
                          >
                            <Bell className="h-3 w-3" />
                          </Button>
                          {next ? (
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => advanceStage.mutate({ trip: t, target: next })}
                              disabled={advanceStage.isPending}
                              className="h-7 px-1.5 text-[11px] gap-1 text-[hsl(var(--blaze))] hover:bg-[hsl(var(--blaze))]/10"
                              title="Mark stage done"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-[hsl(var(--ridge))] mx-1.5" />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <LogCallDialog
        open={!!logCall}
        onClose={() => setLogCall(null)}
        trip={logCall?.trip}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["trips_kanban_activity"] });
        }}
      />
      <ReminderDialog
        open={!!remind}
        onClose={() => setRemind(null)}
        trip={remind?.trip}
        userId={profile?.id}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["trips_kanban_activity"] });
        }}
      />
    </AppLayout>
  );
};

/* ---------- Log Call dialog ---------- */

const OUTCOMES = [
  { value: "connected", label: "Connected" },
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Busy" },
  { value: "switched_off", label: "Switched off" },
  { value: "wrong_number", label: "Wrong number" },
];

function LogCallDialog({ open, onClose, trip, onSaved }: { open: boolean; onClose: () => void; trip: any; onSaved: () => void }) {
  const [outcome, setOutcome] = useState("connected");
  const [notes, setNotes] = useState("");
  const [setFollowUp, setSetFollowUp] = useState(false);
  const [followDate, setFollowDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => { setOutcome("connected"); setNotes(""); setSetFollowUp(false); setFollowDate(undefined); };

  const save = async () => {
    if (!trip) return;
    setSaving(true);
    try {
      if (trip.lead_id) {
        await supabase.from("lead_timeline").insert({
          lead_id: trip.lead_id,
          event_type: "call_logged",
          note: notes || `Call: ${outcome}`,
          metadata: { trip_id: trip.id, cashflow_code: trip.cashflow_code, outcome, stage: trip.trip_stage },
        });
      }
      if (setFollowUp && followDate) {
        await supabase.from("reminders").insert({
          title: `Follow up: ${trip.traveller_name} (${trip.cashflow_code})`,
          reminder_type: "follow_up",
          due_at: followDate.toISOString(),
          trip_id: trip.id,
          lead_id: trip.lead_id || null,
          notes: notes || null,
          status: "pending",
        } as any);
      }
      toast.success("Call logged");
      onSaved();
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-4 w-4 text-[hsl(var(--ridge))]" />
            Log call — {trip?.traveller_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OUTCOMES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was discussed…"
              className="mt-1 text-[13px]"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="follow" checked={setFollowUp} onCheckedChange={setSetFollowUp} />
            <Label htmlFor="follow" className="text-xs cursor-pointer">Set follow-up reminder</Label>
          </div>
          {setFollowUp && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-[13px] font-normal">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  {followDate ? format(followDate, "PPP p") : "Pick date & time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={followDate}
                  onSelect={(d) => {
                    if (d) {
                      const next = new Date(d);
                      next.setHours(10, 0, 0, 0);
                      setFollowDate(next);
                    }
                  }}
                  className="p-3 pointer-events-auto"
                />
                {followDate && (
                  <div className="p-2 border-t flex items-center gap-2">
                    <Input
                      type="time"
                      value={format(followDate, "HH:mm")}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        const d = new Date(followDate);
                        d.setHours(h, m, 0, 0);
                        setFollowDate(d);
                      }}
                      className="h-8 text-[13px]"
                    />
                  </div>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
          <Button onClick={save} disabled={saving || (setFollowUp && !followDate)}>
            {saving ? "Saving…" : "Log call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Reminder dialog ---------- */

function ReminderDialog({ open, onClose, trip, userId, onSaved }: { open: boolean; onClose: () => void; trip: any; userId?: string; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [type, setType] = useState("task");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!trip || !date) return;
    setSaving(true);
    try {
      await supabase.from("reminders").insert({
        title: title || `${trip.traveller_name} — ${trip.cashflow_code}`,
        reminder_type: type,
        due_at: date.toISOString(),
        trip_id: trip.id,
        lead_id: trip.lead_id || null,
        assigned_to: userId || null,
        status: "pending",
      } as any);
      if (trip.lead_id) {
        await supabase.from("lead_timeline").insert({
          lead_id: trip.lead_id,
          event_type: "reminder_set",
          note: `Reminder: ${title || type} @ ${format(date, "PPP p")}`,
          metadata: { trip_id: trip.id, cashflow_code: trip.cashflow_code, due_at: date.toISOString() },
        });
      }
      toast.success("Reminder created");
      onSaved();
      setTitle(""); setDate(undefined); setType("task");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-[hsl(var(--blaze))]" />
            New reminder — {trip?.traveller_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What to do…" className="mt-1 h-9 text-[13px]" />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="briefing_call">Briefing Call</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Due</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-[13px] font-normal mt-1">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  {date ? format(date, "PPP p") : "Pick date & time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUI
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    if (d) {
                      const next = new Date(d);
                      next.setHours(10, 0, 0, 0);
                      setDate(next);
                    }
                  }}
                  className="p-3 pointer-events-auto"
                />
                {date && (
                  <div className="p-2 border-t">
                    <Input
                      type="time"
                      value={format(date, "HH:mm")}
                      onChange={(e) => {
                        const [h, m] = e.target.value.split(":").map(Number);
                        const d = new Date(date);
                        d.setHours(h, m, 0, 0);
                        setDate(d);
                      }}
                      className="h-8 text-[13px]"
                    />
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !date}>{saving ? "Saving…" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TripsKanban;