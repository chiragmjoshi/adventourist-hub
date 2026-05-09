import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Bell, CheckCircle2, Clock, AlarmClock, Phone, IndianRupee, ListTodo, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, startOfMonth, endOfMonth, addMonths, subMonths, isBefore, isToday, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  follow_up: { label: "Follow Up", icon: Phone, color: "bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))]" },
  briefing_call: { label: "Briefing Call", icon: AlarmClock, color: "bg-[hsl(var(--horizon))]/10 text-[hsl(var(--horizon))]" },
  payment: { label: "Payment", icon: IndianRupee, color: "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))]" },
  task: { label: "Task", icon: ListTodo, color: "bg-[hsl(var(--blaze))]/10 text-[hsl(var(--blaze))]" },
  other: { label: "Other", icon: Bell, color: "bg-muted text-foreground/70" },
};

const Reminders = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [calCursor, setCalCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());

  const [form, setForm] = useState({
    title: "", reminder_type: "task", due_at: "", lead_id: "", trip_id: "",
    assigned_to: "", notes: "",
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reminders" as any)
        .select("*, leads(id, name, traveller_code), trip_cashflow(id, cashflow_code), users:assigned_to(id, name)")
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["leads_min"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, name, traveller_code").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["trips_min"],
    queryFn: async () => {
      const { data } = await supabase.from("trip_cashflow").select("id, cashflow_code, traveller_name").order("created_at", { ascending: false }).limit(500);
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users_min"],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("id, name").eq("is_active", true);
      return data || [];
    },
  });

  const reset = () => {
    setEditing(null);
    setForm({ title: "", reminder_type: "task", due_at: "", lead_id: "", trip_id: "", assigned_to: "", notes: "" });
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      title: r.title || "",
      reminder_type: r.reminder_type || "task",
      due_at: r.due_at ? format(new Date(r.due_at), "yyyy-MM-dd'T'HH:mm") : "",
      lead_id: r.lead_id || "",
      trip_id: r.trip_id || "",
      assigned_to: r.assigned_to || "",
      notes: r.notes || "",
    });
    setSheetOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      if (!form.due_at) throw new Error("Due date & time is required");
      const payload: any = {
        title: form.title.trim(),
        reminder_type: form.reminder_type,
        due_at: new Date(form.due_at).toISOString(),
        lead_id: form.lead_id || null,
        trip_id: form.trip_id || null,
        assigned_to: form.assigned_to || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("reminders" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.created_by = profile?.id || null;
        const { error } = await supabase.from("reminders" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success(editing ? "Reminder updated" : "Reminder created");
      setSheetOpen(false);
      reset();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reminders" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      toast.success("Reminder deleted");
    },
  });

  const grouped = useMemo(() => {
    const overdue: any[] = [], today: any[] = [], upcoming: any[] = [], done: any[] = [];
    const now = new Date();
    reminders.forEach((r: any) => {
      if (r.status === "done") { done.push(r); return; }
      const d = new Date(r.due_at);
      if (isToday(d)) today.push(r);
      else if (isBefore(d, now)) overdue.push(r);
      else upcoming.push(r);
    });
    return { overdue, today, upcoming, done };
  }, [reminders]);

  const calDays = useMemo(() => {
    const map: Record<string, any[]> = {};
    reminders.forEach((r: any) => {
      const k = format(new Date(r.due_at), "yyyy-MM-dd");
      (map[k] = map[k] || []).push(r);
    });
    return map;
  }, [reminders]);

  const dueOnSelected = selectedDay
    ? reminders.filter((r: any) => isSameDay(new Date(r.due_at), selectedDay))
    : [];

  const ReminderRow = ({ r }: { r: any }) => {
    const meta = TYPE_META[r.reminder_type] || TYPE_META.other;
    const Icon = meta.icon;
    const isDone = r.status === "done";
    return (
      <div className={`flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors group ${isDone ? "opacity-60" : ""}`}>
        <button
          onClick={() => toggleStatus.mutate({ id: r.id, status: isDone ? "pending" : "done" })}
          className="mt-0.5 flex-shrink-0"
          title={isDone ? "Mark pending" : "Mark done"}
        >
          {isDone
            ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--ridge))]" />
            : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/40 hover:border-primary" />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(r)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isDone ? "line-through" : ""}`}>{r.title}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${meta.color} border-0 rounded-md`}>
              <Icon className="h-3 w-3 mr-1" />{meta.label}
            </Badge>
            {r.leads && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/admin/leads/${r.leads.id}`); }}
                className="text-[11px] text-primary hover:underline font-mono"
              >{r.leads.traveller_code}</button>
            )}
            {r.trip_cashflow && (
              <span className="text-[11px] font-mono text-muted-foreground">{r.trip_cashflow.cashflow_code}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(r.due_at), "dd MMM yyyy, hh:mm a")}</span>
            {r.users?.name && <span>· {r.users.name}</span>}
          </div>
          {r.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.notes}</p>}
        </div>
        <button
          onClick={() => { if (confirm("Delete this reminder?")) remove.mutate(r.id); }}
          className="opacity-0 group-hover:opacity-100 text-xs text-destructive transition-opacity"
        >Delete</button>
      </div>
    );
  };

  return (
    <AppLayout title="Reminders & Calendar">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Reminders & Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{reminders.length} reminders</p>
        </div>
        <Button onClick={() => { reset(); setSheetOpen(true); }} className="rounded-md">
          <Plus className="h-4 w-4 mr-1.5" />New Reminder
        </Button>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList className="mb-4">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-5">
          {grouped.overdue.length > 0 && (
            <Card className="border-destructive/30 shadow-none">
              <div className="px-4 py-2 bg-destructive/5 text-xs font-semibold text-destructive uppercase tracking-wider">Overdue · {grouped.overdue.length}</div>
              <CardContent className="p-0">{grouped.overdue.map((r) => <ReminderRow key={r.id} r={r} />)}</CardContent>
            </Card>
          )}
          <Card className="border-border/50 shadow-none">
            <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Today · {grouped.today.length}</div>
            <CardContent className="p-0">
              {grouped.today.length === 0
                ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing due today</div>
                : grouped.today.map((r) => <ReminderRow key={r.id} r={r} />)}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-none">
            <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming · {grouped.upcoming.length}</div>
            <CardContent className="p-0">
              {grouped.upcoming.length === 0
                ? <div className="px-4 py-6 text-center text-xs text-muted-foreground">No upcoming reminders</div>
                : grouped.upcoming.map((r) => <ReminderRow key={r.id} r={r} />)}
            </CardContent>
          </Card>
          {grouped.done.length > 0 && (
            <Card className="border-border/50 shadow-none">
              <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed · {grouped.done.length}</div>
              <CardContent className="p-0">{grouped.done.slice(0, 20).map((r) => <ReminderRow key={r.id} r={r} />)}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <div className="grid lg:grid-cols-[auto_1fr] gap-6">
            <Card className="border-border/50 shadow-none p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <button onClick={() => setCalCursor(subMonths(calCursor, 1))} className="p-1 hover:bg-muted rounded"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm font-semibold">{format(calCursor, "MMMM yyyy")}</span>
                <button onClick={() => setCalCursor(addMonths(calCursor, 1))} className="p-1 hover:bg-muted rounded"><ChevronRight className="h-4 w-4" /></button>
              </div>
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                month={calCursor}
                onMonthChange={setCalCursor}
                modifiers={{
                  hasReminder: (d) => !!calDays[format(d, "yyyy-MM-dd")],
                }}
                modifiersClassNames={{
                  hasReminder: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-[hsl(var(--blaze))]",
                }}
              />
            </Card>
            <Card className="border-border/50 shadow-none">
              <div className="px-4 py-3 border-b border-border/50">
                <h3 className="text-sm font-semibold">
                  {selectedDay ? format(selectedDay, "EEEE, dd MMM yyyy") : "Select a date"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{dueOnSelected.length} reminder{dueOnSelected.length !== 1 ? "s" : ""}</p>
              </div>
              <CardContent className="p-0">
                {dueOnSelected.length === 0
                  ? <div className="px-4 py-10 text-center text-xs text-muted-foreground">No reminders on this date</div>
                  : dueOnSelected.map((r) => <ReminderRow key={r.id} r={r} />)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={(o) => { setSheetOpen(o); if (!o) reset(); }}>
        <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editing ? "Edit Reminder" : "New Reminder"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
            <div>
              <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="mt-1 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.reminder_type} onValueChange={(v) => setForm({ ...form, reminder_type: v })}>
                  <SelectTrigger className="mt-1 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Due Date & Time <span className="text-destructive">*</span></Label>
                <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} required className="mt-1 rounded-md" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Linked Lead</Label>
              <Select value={form.lead_id || "none"} onValueChange={(v) => setForm({ ...form, lead_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {leads.slice(0, 200).map((l: any) => <SelectItem key={l.id} value={l.id}>{l.traveller_code} · {l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Linked Trip</Label>
              <Select value={form.trip_id || "none"} onValueChange={(v) => setForm({ ...form, trip_id: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {trips.slice(0, 200).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.cashflow_code} · {t.traveller_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Assigned To</Label>
              <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}>
                <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 rounded-md" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={save.isPending}>{editing ? "Save Changes" : "Create"}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default Reminders;