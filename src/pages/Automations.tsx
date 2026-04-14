import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Send, XCircle, Zap, Clock, CheckCircle, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import { formatLabel } from "@/lib/formatLabel";
import { formatDistanceToNow, format } from "date-fns";
import { sendWhatsAppMessage } from "@/services/aisensy";

const maskMobile = (m: string) => {
  if (!m || m.length < 5) return m || "—";
  return `+${m.slice(0, -5).replace(/./g, "X")} ${m.slice(-5)}`;
};

const TRIGGER_ICONS: Record<string, string> = {
  file_closed: "🎉",
  pre_trip_3days: "🔔",
  safe_journey: "✈️",
  review_request: "⭐",
  follow_up_reminder: "📋",
};

const Automations = () => {
  const queryClient = useQueryClient();
  const [queueFilter, setQueueFilter] = useState("all");
  const [responseModal, setResponseModal] = useState<any>(null);

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["automation_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_templates").select("*").order("created_at");
      return (data || []) as any[];
    },
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["automation_stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [{ count: pending }, { count: failed }, { count: sentToday }, { count: totalSent }] = await Promise.all([
        supabase.from("automation_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("automation_queue").select("*", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("automations_log").select("*", { count: "exact", head: true }).eq("status", "sent").gte("fired_at", today.toISOString()),
        supabase.from("automations_log").select("*", { count: "exact", head: true }).eq("status", "sent"),
      ]);
      return { pending: pending || 0, failed: failed || 0, sentToday: sentToday || 0, totalSent: totalSent || 0 };
    },
  });

  // Queue
  const { data: queue = [], refetch: refetchQueue } = useQuery({
    queryKey: ["automation_queue", queueFilter],
    queryFn: async () => {
      let query = supabase
        .from("automation_queue")
        .select("*, automation_templates(name, aisensy_template_name), leads(name, traveller_code)")
        .order("scheduled_for", { ascending: false })
        .limit(100);
      if (queueFilter !== "all") query = query.eq("status", queueFilter);
      const { data } = await query;
      return (data || []) as any[];
    },
  });

  // Activity log
  const { data: logs = [] } = useQuery({
    queryKey: ["automations_log_recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automations_log")
        .select("*, leads(name, traveller_code)")
        .order("fired_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  // Toggle template active
  const toggleTemplate = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("automation_templates").update({ is_active }).eq("id", id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automation_templates"] }); toast.success("Template updated"); },
  });

  // Cancel queue item
  const cancelItem = async (id: string) => {
    await supabase.from("automation_queue").update({ status: "cancelled" }).eq("id", id);
    toast.success("Automation cancelled");
    refetchQueue();
    queryClient.invalidateQueries({ queryKey: ["automation_stats"] });
  };

  // Send now
  const sendNow = async (item: any) => {
    const templateName = item.automation_templates?.aisensy_template_name;
    if (!templateName) { toast.error("No template configured"); return; }

    await supabase.from("automation_queue").update({
      status: "processing",
      attempts: (item.attempts || 0) + 1,
      last_attempted_at: new Date().toISOString(),
    }).eq("id", item.id);

    const result = await sendWhatsAppMessage(
      templateName,
      item.recipient_mobile,
      Array.isArray(item.variables) ? (item.variables as any[]).map(String) : [],
      (item as any).recipient_name || "Customer"
    );

    await supabase.from("automation_queue").update({
      status: result.success ? "sent" : "failed",
      aisensy_response: result.response,
    }).eq("id", item.id);

    // Log
    await supabase.from("automations_log").insert({
      lead_id: item.lead_id,
      trigger_event: item.trigger_event,
      template_name: templateName,
      recipient_mobile: item.recipient_mobile,
      channel: "whatsapp",
      status: result.success ? "sent" : "failed",
      response_payload: result.response,
    });

    toast[result.success ? "success" : "error"](result.success ? "Message sent successfully" : "Failed to send message", { duration: 3000 });
    refetchQueue();
    queryClient.invalidateQueries({ queryKey: ["automation_stats"] });
    queryClient.invalidateQueries({ queryKey: ["automations_log_recent"] });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-[hsl(var(--horizon))]/20 text-[hsl(var(--horizon))]",
      sent: "bg-[hsl(var(--ridge))]/20 text-[hsl(var(--ridge))]",
      failed: "bg-destructive/15 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
      processing: "bg-blue-100 text-blue-700",
    };
    return <Badge className={`text-[10px] border-0 ${colors[status] || ""}`}>{formatLabel(status)}</Badge>;
  };

  const statCards = [
    { label: "Pending", value: stats?.pending || 0, icon: Clock, color: "text-[hsl(var(--horizon))]" },
    { label: "Sent Today", value: stats?.sentToday || 0, icon: CheckCircle, color: "text-[hsl(var(--ridge))]" },
    { label: "Failed", value: stats?.failed || 0, icon: AlertTriangle, color: "text-destructive" },
    { label: "Total Sent", value: stats?.totalSent || 0, icon: Activity, color: "text-primary" },
  ];

  return (
    <AppLayout title="Automations">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">Automations <Zap className="h-5 w-5 text-[hsl(var(--horizon))]" /></h1>
          <p className="text-sm text-muted-foreground">WhatsApp automation queue and activity log</p>
        </div>
        <Link to="/settings?tab=automations">
          <Button variant="outline" size="sm" className="text-xs"><Settings className="h-3.5 w-3.5 mr-1.5" />Configure Templates</Button>
        </Link>
      </div>

      {/* SECTION 1: Live Stats */}
      <div className="grid grid-cols-4 gap-3 mt-5 mb-6">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50 shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Status */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3">Template Status</h2>
        <div className="grid grid-cols-5 gap-3">
          {templates.map((tpl: any) => (
            <Card key={tpl.id} className="border-border/50 shadow-none">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    <span>{TRIGGER_ICONS[tpl.trigger_event] || "⚡"}</span>
                    {tpl.name}
                  </p>
                  <Switch
                    checked={tpl.is_active}
                    onCheckedChange={(v) => toggleTemplate.mutate({ id: tpl.id, is_active: v })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{tpl.description}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{tpl.recipient_type === "agent" ? "Agent" : "Customer"}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{tpl.trigger_event}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* SECTION 2: Queue */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Automation Queue</h2>
          <div className="flex gap-1">
            {["all", "pending", "sent", "failed", "cancelled"].map((f) => (
              <Button key={f} variant={queueFilter === f ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setQueueFilter(f)}>
                {formatLabel(f === "all" ? "All" : f)}
              </Button>
            ))}
          </div>
        </div>
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Zap className="h-10 w-10 mb-3 text-[hsl(var(--horizon))]/40" />
                <p className="text-sm font-medium">No automations in queue</p>
                <p className="text-xs text-muted-foreground mt-1">Automations are scheduled automatically when trips are confirmed</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Scheduled For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Attempts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item: any) => (
                    <TableRow key={item.id} className={item.status === "failed" ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {item.lead_id ? (
                          <Link to={`/leads/${item.lead_id}`} className="text-xs text-primary hover:underline">
                            {(item.leads as any)?.name || "Lead"}<br />
                            <span className="font-mono text-muted-foreground">{(item.leads as any)?.traveller_code}</span>
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="mr-1">{TRIGGER_ICONS[item.trigger_event] || "⚡"}</span>
                        {(item.automation_templates as any)?.name || formatLabel(item.trigger_event)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{maskMobile(item.recipient_mobile)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.scheduled_for ? (
                          <span title={format(new Date(item.scheduled_for), "dd MMM yyyy, HH:mm")}>
                            {formatDistanceToNow(new Date(item.scheduled_for), { addSuffix: true })}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs ${(item.attempts || 0) > 1 ? "text-destructive font-medium" : ""}`}>
                          {item.attempts || 0}/3
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(item.status === "pending" || item.status === "failed") && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => sendNow(item)}>
                              <Send className="h-3 w-3 mr-1" />Send Now
                            </Button>
                          )}
                          {item.status === "pending" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => cancelItem(item.id)}>
                              <XCircle className="h-3 w-3 mr-1" />Cancel
                            </Button>
                          )}
                          {item.status === "sent" && item.aisensy_response && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setResponseModal(item.aisensy_response)}>
                              View Log
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: Activity Log */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-3">Activity Log <span className="text-muted-foreground font-normal text-xs">Last 100 events</span></h2>
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground">
                <Activity className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No automations logged yet</p>
                <p className="text-xs text-muted-foreground mt-1">Activity will appear here once WhatsApp messages are sent</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id} className={log.status === "failed" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">
                        <span title={log.fired_at ? format(new Date(log.fired_at), "dd MMM yyyy, HH:mm") : ""}>
                          {log.fired_at ? formatDistanceToNow(new Date(log.fired_at), { addSuffix: true }) : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.lead_id ? (
                          <Link to={`/leads/${log.lead_id}`} className="text-xs text-primary hover:underline">
                            {(log.leads as any)?.traveller_code || ""} · {(log.leads as any)?.name || "Lead"}
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{log.template_name || formatLabel(log.trigger_event)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{maskMobile(log.recipient_mobile)}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                      <TableCell>
                        {log.response_payload && Object.keys(log.response_payload).length > 0 && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setResponseModal(log.response_payload)}>
                            View Response
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response Modal */}
      <Dialog open={!!responseModal} onOpenChange={() => setResponseModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>AiSensy Response</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(responseModal, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Automations;
