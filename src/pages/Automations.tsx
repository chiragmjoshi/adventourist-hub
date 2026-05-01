import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Zap, MessageSquare, Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import RuleEditor from "@/components/automations/RuleEditor";

const TRIGGER_COLORS: Record<string, string> = {
  lead_created: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  status_changed: "bg-blue-500/15 text-blue-700 border-blue-300",
  disposition_changed: "bg-purple-500/15 text-purple-700 border-purple-300",
  travel_date_approaching: "bg-orange-500/15 text-orange-700 border-orange-300",
  travel_date_passed: "bg-teal-500/15 text-teal-700 border-teal-300",
  inactivity_days: "bg-red-500/15 text-red-700 border-red-300",
  follow_up_date_reached: "bg-indigo-500/15 text-indigo-700 border-indigo-300",
};

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Lead created",
  status_changed: "Status changed",
  disposition_changed: "Disposition changed",
  travel_date_approaching: "Before travel",
  travel_date_passed: "After travel",
  inactivity_days: "Inactivity",
  follow_up_date_reached: "Follow-up due",
};

function conditionSummary(rule: any): string {
  const parts: string[] = [];
  if (rule.condition_status?.length) parts.push(`status → ${rule.condition_status.join(", ")}`);
  if (rule.condition_disposition?.length) parts.push(`disposition → ${rule.condition_disposition.join(", ")}`);
  if (rule.condition_platform?.length) parts.push(`platform → ${rule.condition_platform.join(", ")}`);
  if (rule.trigger_days_before != null && ["travel_date_approaching", "travel_date_passed"].includes(rule.trigger_event)) {
    parts.push(`${rule.trigger_days_before} day${rule.trigger_days_before === 1 ? "" : "s"}`);
  }
  return parts.length ? `When ${parts.join(" • ")}` : "Applies to all leads";
}

const Automations = () => {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [deleteRule, setDeleteRule] = useState<any | null>(null);
  const [logFilters, setLogFilters] = useState({ status: "all", channel: "all", rule: "all" });

  const { data: rules = [] } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_rules").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["automation_stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ count: active }, { count: pending }, { count: failed }, { count: sentToday }] = await Promise.all([
        supabase.from("automation_rules").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("automation_executions").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("automation_executions").select("*", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("automation_executions").select("*", { count: "exact", head: true }).eq("status", "sent").gte("executed_at", today.toISOString()),
      ]);
      return { active: active || 0, pending: pending || 0, failed: failed || 0, sentToday: sentToday || 0 };
    },
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["automation_executions", logFilters],
    queryFn: async () => {
      let q = supabase
        .from("automation_executions")
        .select("*, automation_rules(name), leads(name, traveller_code)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (logFilters.status !== "all") q = q.eq("status", logFilters.status);
      if (logFilters.channel !== "all") q = q.eq("channel", logFilters.channel);
      if (logFilters.rule !== "all") q = q.eq("rule_id", logFilters.rule);
      const { data } = await q;
      return (data || []) as any[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("automation_rules").update({ is_active: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation_rules"] }),
  });

  const deleteRuleMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["automation_rules"] });
      qc.invalidateQueries({ queryKey: ["automation_executions"] });
      toast.success("Rule deleted");
      setDeleteRule(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const retryExecution = async (ex: any) => {
    await supabase.from("automation_executions").update({ status: "pending", scheduled_for: new Date().toISOString() }).eq("id", ex.id);
    qc.invalidateQueries({ queryKey: ["automation_executions"] });
    toast.success("Re-queued");
  };

  return (
    <AppLayout title="Automations">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-xs text-muted-foreground">Create rules that run automatically based on lead activity.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingRule(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Rule
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 my-5">
        {[
          { label: "Active rules", value: stats?.active || 0, icon: Zap, color: "text-emerald-600" },
          { label: "Sent today", value: stats?.sentToday || 0, icon: MessageSquare, color: "text-blue-600" },
          { label: "Pending", value: stats?.pending || 0, icon: RefreshCw, color: "text-amber-600" },
          { label: "Failed", value: stats?.failed || 0, icon: Mail, color: "text-red-600" },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 shadow-none">
            <CardContent className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="text-xl font-semibold">{s.value}</p>
              </div>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rules list */}
      <h2 className="text-sm font-medium mb-3">Rules</h2>
      {rules.length === 0 ? (
        <Card className="border-dashed border-border/50 shadow-none">
          <CardContent className="px-6 py-10 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No automation rules yet</p>
            <p className="text-xs text-muted-foreground mb-3">Create your first rule to start automating customer messages.</p>
            <Button size="sm" onClick={() => { setEditingRule(null); setEditorOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />New Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {rules.map((r: any) => (
            <Card key={r.id} className="border-border/50 shadow-none">
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    {r.description && <p className="text-[11px] text-muted-foreground truncate">{r.description}</p>}
                  </div>
                  <Switch checked={r.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: r.id, value: v })} />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <Badge variant="outline" className={`text-[10px] ${TRIGGER_COLORS[r.trigger_event] || ""}`}>
                    {TRIGGER_LABELS[r.trigger_event] || r.trigger_event}
                  </Badge>
                  {r.wa_enabled && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-300">WA → {r.wa_recipient}</Badge>}
                  {r.email_enabled && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 border-blue-300">Email → {r.email_recipient}</Badge>}
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{conditionSummary(r)}</p>
                <div className="flex items-center justify-between border-t pt-2 mt-2">
                  <p className="text-[10px] text-muted-foreground">
                    Ran {r.run_count || 0} times{r.last_run_at ? ` • ${formatDistanceToNow(new Date(r.last_run_at), { addSuffix: true })}` : ""}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRule(r); setEditorOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteRule(r)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Execution log */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium">Execution log</h2>
        <div className="flex gap-2">
          <Select value={logFilters.status} onValueChange={(v) => setLogFilters((f) => ({ ...f, status: v }))}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "pending", "sent", "failed", "skipped"].map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={logFilters.channel} onValueChange={(v) => setLogFilters((f) => ({ ...f, channel: v }))}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["all", "whatsapp", "email"].map((s) => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={logFilters.rule} onValueChange={(v) => setLogFilters((f) => ({ ...f, rule: v }))}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Rule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All rules</SelectItem>
              {rules.map((r: any) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/50 shadow-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] uppercase">Time</TableHead>
              <TableHead className="text-[10px] uppercase">Rule</TableHead>
              <TableHead className="text-[10px] uppercase">Lead</TableHead>
              <TableHead className="text-[10px] uppercase">Channel</TableHead>
              <TableHead className="text-[10px] uppercase">Recipient</TableHead>
              <TableHead className="text-[10px] uppercase">Preview</TableHead>
              <TableHead className="text-[10px] uppercase">Status</TableHead>
              <TableHead className="text-[10px] uppercase"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {executions.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">No executions yet</TableCell></TableRow>
            ) : (
              executions.map((ex: any) => (
                <TableRow key={ex.id}>
                  <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(ex.created_at), "dd MMM HH:mm")}</TableCell>
                  <TableCell className="text-xs">{ex.automation_rules?.name || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {ex.leads ? <Link to={`/leads/${ex.lead_id}`} className="text-primary hover:underline">{ex.leads.name} <span className="text-muted-foreground">({ex.leads.traveller_code})</span></Link> : "—"}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] capitalize">{ex.channel}</Badge></TableCell>
                  <TableCell className="text-[11px] capitalize">{ex.recipient_type}</TableCell>
                  <TableCell className="text-[11px] text-muted-foreground max-w-[260px] truncate">{ex.message_preview || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] ${
                      ex.status === "sent" ? "bg-emerald-500/15 text-emerald-700 border-emerald-300" :
                      ex.status === "failed" ? "bg-red-500/15 text-red-700 border-red-300" :
                      ex.status === "pending" ? "bg-amber-500/15 text-amber-700 border-amber-300" :
                      "bg-muted text-muted-foreground"
                    }`}>{ex.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {ex.status === "failed" && (
                      <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => retryExecution(ex)}>
                        <RefreshCw className="h-3 w-3 mr-1" />Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <RuleEditor open={editorOpen} onClose={() => setEditorOpen(false)} rule={editingRule} />

      <AlertDialog open={!!deleteRule} onOpenChange={(v) => !v && setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rule?</AlertDialogTitle>
            <AlertDialogDescription>"{deleteRule?.name}" will be permanently removed. Past execution history is preserved.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRule && deleteRuleMut.mutate(deleteRule.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Automations;
