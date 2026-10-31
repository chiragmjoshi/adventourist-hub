import { useMemo, useState } from "react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Pencil, Trash2, Plus, Zap, Mail, RefreshCw, MessageCircle, MessageSquare, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import RuleEditor from "@/components/automations/RuleEditor";
import { BRAND } from "@/lib/brandColors";

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Lead created",
  status_changed: "Status changed",
  disposition_changed: "Disposition changed",
  travel_date_approaching: "Before travel",
  travel_date_passed: "After travel",
  inactivity_days: "Inactivity",
  follow_up_date_reached: "Follow-up due",
  customer_birthday: "Birthday",
  customer_anniversary: "Anniversary",
};

const TRIGGER_COLORS: Record<string, string> = {
  lead_created: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  status_changed: "bg-blue-500/10 text-blue-700 border-blue-200",
  disposition_changed: "bg-purple-500/10 text-purple-700 border-purple-200",
  travel_date_approaching: "bg-orange-500/10 text-orange-700 border-orange-200",
  travel_date_passed: "bg-teal-500/10 text-teal-700 border-teal-200",
  inactivity_days: "bg-red-500/10 text-red-700 border-red-200",
  follow_up_date_reached: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
  customer_birthday: "bg-pink-500/10 text-pink-700 border-pink-200",
  customer_anniversary: "bg-rose-500/10 text-rose-700 border-rose-200",
};

function conditionSummary(rule: any): string {
  const parts: string[] = [];
  if (rule.condition_status?.length) parts.push(`status: ${rule.condition_status.join(", ")}`);
  if (rule.condition_disposition?.length) parts.push(`disposition: ${rule.condition_disposition.join(", ")}`);
  if (rule.condition_platform?.length) parts.push(`platform: ${rule.condition_platform.join(", ")}`);
  if (rule.trigger_days_before != null && ["travel_date_approaching", "travel_date_passed"].includes(rule.trigger_event)) {
    const n = rule.trigger_days_before;
    if (n < 0) parts.push(`${Math.abs(n)}d after start`);
    else if (n === 0) parts.push("on travel date");
    else parts.push(`${n}d before`);
  }
  return parts.length ? parts.join(" · ") : "All leads";
}

const Automations = () => {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [deleteRule, setDeleteRule] = useState<any | null>(null);
  const [logFilters, setLogFilters] = useState({ status: "all", rule: "all" });

  const { data: rules = [] } = useQuery({
    queryKey: ["automation_rules"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_rules").select("*").order("is_active", { ascending: false }).order("name");
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

  // Channel config (email SMTP + WhatsApp AiSensy) — read-only status cards
  // at the top of the page. The actual fields live in automation_settings and
  // are edited from Settings → Automations, so this is a "where to look" strip.
  const { data: channels } = useQuery({
    queryKey: ["automation_channels"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_settings").select("key, value").in(
        "key",
        ["aisensy_api_key", "email_from_name", "email_from_address", "smtp_host"],
      );
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => { map[r.key] = r.value || ""; });
      const emailConfigured = !!(map.smtp_host && map.email_from_address);
      const aisensyKey = (map.aisensy_api_key || "").trim();
      const whatsappConfigured = !!(aisensyKey && aisensyKey !== "REPLACE_WITH_YOUR_API_KEY");
      return {
        email: { configured: emailConfigured, from: map.email_from_address || "", name: map.email_from_name || "" },
        whatsapp: { configured: whatsappConfigured },
      };
    },
  });

  const { data: trend30d = { daily: [] as any[], ruleStats: new Map<string, { sent: number; failed: number; skipped: number }>() } } = useQuery({
    queryKey: ["automation_trend_30d"],
    queryFn: async () => {
      const since = startOfDay(subDays(new Date(), 29)).toISOString();
      const { data } = await supabase
        .from("automation_executions")
        .select("rule_id, status, created_at, executed_at")
        .gte("created_at", since)
        .limit(5000);
      const rows = (data || []) as any[];
      const byDay: Record<string, { day: string; sent: number; failed: number; skipped: number; label: string }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        byDay[d] = { day: d, sent: 0, failed: 0, skipped: 0, label: format(new Date(d), "dd MMM") };
      }
      const ruleStats = new Map<string, { sent: number; failed: number; skipped: number }>();
      for (const r of rows) {
        const whenRaw = r.executed_at || r.created_at;
        if (!whenRaw) continue;
        const key = format(new Date(whenRaw), "yyyy-MM-dd");
        const s = r.status;
        if (byDay[key] && (s === "sent" || s === "failed" || s === "skipped")) {
          byDay[key][s]++;
        }
        if (r.rule_id && (s === "sent" || s === "failed" || s === "skipped")) {
          const cur = ruleStats.get(r.rule_id) || { sent: 0, failed: 0, skipped: 0 };
          cur[s]++;
          ruleStats.set(r.rule_id, cur);
        }
      }
      return { daily: Object.values(byDay), ruleStats };
    },
    staleTime: 5 * 60 * 1000,
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

  const sent30 = useMemo(() => trend30d.daily.reduce((s, d) => s + d.sent, 0), [trend30d.daily]);
  const failed30 = useMemo(() => trend30d.daily.reduce((s, d) => s + d.failed, 0), [trend30d.daily]);
  const skipped30 = useMemo(() => trend30d.daily.reduce((s, d) => s + d.skipped, 0), [trend30d.daily]);

  return (
    <AppLayout title="Comms Automation">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Comms Automation</h1>
          <p className="text-xs text-muted-foreground">Email, WhatsApp and SMS rules fired on lead activity.</p>
        </div>
        <Button size="sm" onClick={() => { setEditingRule(null); setEditorOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" />New rule
        </Button>
      </div>

      {/* Channels — one source of truth on page load for "is this working". */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <ChannelCard
          icon={<Mail className="h-4 w-4" />}
          name="Email"
          configured={channels?.email.configured ?? false}
          detail={channels?.email.configured
            ? `${channels.email.name || ""} <${channels.email.from}>`.trim()
            : "Not configured — set SMTP in Settings"}
          configureHref="/admin/settings"
        />
        <ChannelCard
          icon={<MessageCircle className="h-4 w-4" />}
          name="WhatsApp"
          configured={channels?.whatsapp.configured ?? false}
          detail={channels?.whatsapp.configured ? "AiSensy connected" : "AiSensy API key not set"}
          configureHref="/admin/settings"
        />
        <ChannelCard
          icon={<MessageSquare className="h-4 w-4" />}
          name="SMS"
          configured={false}
          soon
          detail="Provider wiring deferred (F-11)"
        />
      </div>

      {/* Tiny dashboard. */}
      <div className="grid grid-cols-4 gap-3 mt-5">
        {[
          { label: "Active rules", value: stats?.active ?? 0, color: "text-emerald-600", icon: Zap },
          { label: "Sent today", value: stats?.sentToday ?? 0, color: "text-blue-600", icon: Mail },
          { label: "Pending", value: stats?.pending ?? 0, color: "text-amber-600", icon: RefreshCw },
          { label: "Failed", value: stats?.failed ?? 0, color: "text-red-600", icon: AlertCircle },
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

      {/* Rules — single clean table. One line per rule; condition under the
          name. "Last 30d" and "Last fired" are the "is it alive" columns. */}
      <h2 className="text-sm font-medium mt-6 mb-2">Rules</h2>
      {rules.length === 0 ? (
        <Card className="border-dashed border-border/50 shadow-none">
          <CardContent className="px-6 py-10 text-center">
            <Zap className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No automation rules yet</p>
            <p className="text-xs text-muted-foreground mb-3">Create your first rule to start automating customer messages.</p>
            <Button size="sm" onClick={() => { setEditingRule(null); setEditorOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />New rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-none">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] uppercase">Rule</TableHead>
                <TableHead className="text-[10px] uppercase">Trigger</TableHead>
                <TableHead className="text-[10px] uppercase">Channels</TableHead>
                <TableHead className="text-[10px] uppercase whitespace-nowrap">Last 30d</TableHead>
                <TableHead className="text-[10px] uppercase whitespace-nowrap">Last fired</TableHead>
                <TableHead className="text-[10px] uppercase">Active</TableHead>
                <TableHead className="text-[10px] uppercase w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((r: any) => {
                const s = trend30d.ruleStats.get(r.id);
                return (
                  <TableRow key={r.id} className={!r.is_active ? "opacity-60" : ""}>
                    <TableCell className="py-2">
                      <p className="text-xs font-medium">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground">{conditionSummary(r)}</p>
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className={`text-[10px] ${TRIGGER_COLORS[r.trigger_event] || ""}`}>
                        {TRIGGER_LABELS[r.trigger_event] || r.trigger_event}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        {r.email_enabled && <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-700 border-blue-200">Email → {r.email_recipient}</Badge>}
                        {r.wa_enabled && <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-700 border-emerald-200">WhatsApp</Badge>}
                        {!r.email_enabled && !r.wa_enabled && <span className="text-[10px] text-muted-foreground">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-[10px] whitespace-nowrap">
                      {!s || (s.sent === 0 && s.failed === 0 && s.skipped === 0) ? (
                        <span className="text-muted-foreground">no activity</span>
                      ) : (
                        <span className="space-x-1.5">
                          {s.sent > 0 && <span className="text-emerald-700 font-medium">{s.sent}✓</span>}
                          {s.failed > 0 && <span className="text-red-600 font-medium">{s.failed}✗</span>}
                          {s.skipped > 0 && <span className="text-amber-600 font-medium">{s.skipped}↷</span>}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-[10px] text-muted-foreground whitespace-nowrap">
                      {r.last_run_at ? formatDistanceToNow(new Date(r.last_run_at), { addSuffix: true }) : "never"}
                    </TableCell>
                    <TableCell className="py-2">
                      <Switch
                        checked={r.is_active}
                        onCheckedChange={(v) => toggleActive.mutate({ id: r.id, value: v })}
                        aria-label={`${r.is_active ? "Disable" : "Enable"} rule ${r.name}`}
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRule(r); setEditorOpen(true); }} aria-label={`Edit rule ${r.name}`}>
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleteRule(r)} aria-label={`Delete rule ${r.name}`}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Activity + trend collapsed by default — surfaces when you need to
          debug "did it actually send?", stays out of the way otherwise. */}
      <Accordion type="single" collapsible className="mt-6">
        <AccordionItem value="activity" className="border rounded-md">
          <AccordionTrigger className="px-4 py-2 text-sm hover:no-underline">
            <span className="flex items-center gap-2">
              Activity &amp; trend
              <span className="text-[11px] text-muted-foreground font-normal">
                30d: {sent30} sent · {failed30} failed · {skipped30} skipped
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="h-40 w-full mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend30d.daily} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip wrapperStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sent"    stackId="s" fill={BRAND.ridge}  name="Sent" />
                  <Bar dataKey="failed"  stackId="s" fill="#dc2626"      name="Failed" />
                  <Bar dataKey="skipped" stackId="s" fill={BRAND.horizon} name="Skipped" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium">Recent executions</h3>
              <div className="flex gap-2">
                <Select value={logFilters.status} onValueChange={(v) => setLogFilters((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["all", "pending", "sent", "failed", "skipped"].map((s) => <SelectItem key={s} value={s} className="text-[11px] capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={logFilters.rule} onValueChange={(v) => setLogFilters((f) => ({ ...f, rule: v }))}>
                  <SelectTrigger className="h-7 w-40 text-[11px]"><SelectValue placeholder="Rule" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-[11px]">All rules</SelectItem>
                    {rules.map((r: any) => <SelectItem key={r.id} value={r.id} className="text-[11px]">{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Time</TableHead>
                  <TableHead className="text-[10px] uppercase">Rule</TableHead>
                  <TableHead className="text-[10px] uppercase">Lead</TableHead>
                  <TableHead className="text-[10px] uppercase">Channel</TableHead>
                  <TableHead className="text-[10px] uppercase">Status</TableHead>
                  <TableHead className="text-[10px] uppercase"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No executions yet</TableCell></TableRow>
                ) : (
                  executions.map((ex: any) => (
                    <TableRow key={ex.id}>
                      <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">{format(new Date(ex.created_at), "dd MMM HH:mm")}</TableCell>
                      <TableCell className="text-xs">{ex.automation_rules?.name || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {ex.leads ? <Link to={`/admin/leads/${ex.lead_id}`} className="text-primary hover:underline">{ex.leads.name} <span className="text-muted-foreground">({ex.leads.traveller_code})</span></Link> : "—"}
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{ex.channel}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${
                          ex.status === "sent" ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" :
                          ex.status === "failed" ? "bg-red-500/10 text-red-700 border-red-200" :
                          ex.status === "pending" ? "bg-amber-500/10 text-amber-700 border-amber-200" :
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
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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

function ChannelCard({
  icon, name, configured, detail, configureHref, soon,
}: {
  icon: React.ReactNode;
  name: string;
  configured: boolean;
  detail: string;
  configureHref?: string;
  soon?: boolean;
}) {
  return (
    <Card className="border-border/50 shadow-none">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{icon}</span>
            <p className="text-sm font-medium">{name}</p>
          </div>
          {soon ? (
            <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border">Coming soon</Badge>
          ) : configured ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-700">
              <AlertCircle className="h-3 w-3" />Not configured
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{detail}</p>
        {configureHref && !soon && (
          <Link to={configureHref} className="text-[10px] text-primary hover:underline mt-1 inline-block">Configure in Settings →</Link>
        )}
      </CardContent>
    </Card>
  );
}

export default Automations;
