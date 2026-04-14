import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Send, XCircle, Zap, Eye, EyeOff, Save } from "lucide-react";
import { toast } from "sonner";
import { formatLabel } from "@/lib/formatLabel";
import { formatDistanceToNow, format } from "date-fns";
import { sendWhatsAppMessage } from "@/services/aisensy";

const Automations = () => {
  const queryClient = useQueryClient();
  const [queueFilter, setQueueFilter] = useState("all");

  // Templates
  const { data: templates = [] } = useQuery({
    queryKey: ["automation_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_templates" as any).select("*").order("created_at");
      return (data || []) as any[];
    },
  });

  // Template message counts
  const { data: templateCounts = {} } = useQuery({
    queryKey: ["automation_template_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("automations_log").select("trigger_event, status");
      const counts: Record<string, { sent: number; lastSent?: string }> = {};
      (data || []).forEach((log: any) => {
        if (!counts[log.trigger_event]) counts[log.trigger_event] = { sent: 0 };
        if (log.status === "sent") counts[log.trigger_event].sent++;
      });
      return counts;
    },
  });

  // Queue
  const { data: queue = [], refetch: refetchQueue } = useQuery({
    queryKey: ["automation_queue", queueFilter],
    queryFn: async () => {
      let query = supabase
        .from("automation_queue" as any)
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
        .limit(50);
      return data || [];
    },
  });

  // Settings
  const { data: autoSettings = [] } = useQuery({
    queryKey: ["automation_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_settings").select("*");
      return data || [];
    },
  });

  const getSettingVal = (key: string) => autoSettings.find((s: any) => s.key === key)?.value || "";

  // Toggle template active
  const toggleTemplate = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      await supabase.from("automation_templates" as any).update({ is_active }).eq("id", id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automation_templates"] }); toast.success("Template updated"); },
  });

  // Cancel queue item
  const cancelItem = async (id: string) => {
    await supabase.from("automation_queue" as any).update({ status: "cancelled" }).eq("id", id);
    toast.success("Automation cancelled");
    refetchQueue();
  };

  // Send now
  const sendNow = async (item: any) => {
    const templateName = item.automation_templates?.aisensy_template_name;
    if (!templateName) { toast.error("No template configured"); return; }

    const result = await sendWhatsAppMessage(
      templateName,
      item.recipient_mobile,
      Array.isArray(item.variables) ? item.variables : [],
      "Adventourist"
    );

    await supabase.from("automation_queue" as any).update({
      status: result.success ? "sent" : "failed",
      aisensy_response: result.response,
      attempts: (item.attempts || 0) + 1,
      last_attempted_at: new Date().toISOString(),
    }).eq("id", item.id);

    if (result.success) {
      toast.success("Message sent successfully");
    } else {
      toast.error("Failed to send message");
    }
    refetchQueue();
  };

  // Save setting
  const saveSetting = async (key: string, value: string) => {
    await supabase.from("automation_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
    queryClient.invalidateQueries({ queryKey: ["automation_settings"] });
    toast.success("Setting saved");
  };

  const [settingValues, setSettingValues] = useState<Record<string, string>>({});
  const getOrDefault = (key: string) => settingValues[key] ?? getSettingVal(key);
  const [showApiKey, setShowApiKey] = useState(false);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      sent: "bg-ridge/20 text-ridge",
      failed: "bg-destructive/20 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
      processing: "bg-blue-100 text-blue-700",
    };
    return <Badge className={`text-[10px] ${colors[status] || ""}`}>{formatLabel(status)}</Badge>;
  };

  const recipientBadge = (type: string) => (
    <Badge variant="outline" className="text-[10px]">{type === "agent" ? "Agent" : "Customer"}</Badge>
  );

  return (
    <AppLayout title="Automations">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold">Automations</h1>
          <p className="text-sm text-muted-foreground">WhatsApp automation for customer journey</p>
        </div>
        <Link to="/settings?tab=automations">
          <Button variant="outline" size="sm"><Settings className="h-3.5 w-3.5 mr-1.5" />Configure Templates</Button>
        </Link>
      </div>

      {/* SECTION 1: Template Status */}
      <div className="mt-5 mb-6">
        <h2 className="text-sm font-medium mb-3">Template Status</h2>
        <div className="grid grid-cols-5 gap-3">
          {templates.map((tpl: any) => {
            const counts = (templateCounts as any)[tpl.trigger_event] || { sent: 0 };
            return (
              <Card key={tpl.id} className="border-border/50 shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{tpl.name}</p>
                    <Switch
                      checked={tpl.is_active}
                      onCheckedChange={(v) => toggleTemplate.mutate({ id: tpl.id, is_active: v })}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{tpl.description}</p>
                  <div className="flex items-center gap-2">
                    {recipientBadge(tpl.recipient_type)}
                    <Badge variant="secondary" className="text-[10px]">{tpl.trigger_event}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{counts.sent} sent</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Queue Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Automation Queue</h2>
          <div className="flex gap-1">
            {["all", "pending", "sent", "failed"].map((f) => (
              <Button key={f} variant={queueFilter === f ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setQueueFilter(f)}>
                {formatLabel(f === "all" ? "All" : f)}
              </Button>
            ))}
          </div>
        </div>
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <Zap className="h-8 w-8 mb-2" /><p className="text-sm">No items in queue</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead><TableHead>Template</TableHead><TableHead>Scheduled</TableHead>
                    <TableHead>Status</TableHead><TableHead>Attempts</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item: any) => (
                    <TableRow key={item.id} className={item.status === "failed" ? "bg-destructive/5" : ""}>
                      <TableCell>
                        {item.lead_id ? (
                          <Link to={`/leads/${item.lead_id}`} className="text-xs text-primary hover:underline">
                            {item.leads?.name || "Lead"}<br /><span className="font-mono text-muted-foreground">{item.leads?.traveller_code}</span>
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{item.automation_templates?.name || formatLabel(item.trigger_event)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.scheduled_for ? format(new Date(item.scheduled_for), "dd MMM yy, HH:mm") : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-xs text-center">{item.attempts}/3</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(item.status === "pending" || item.status === "failed") && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => sendNow(item)}>
                              <Send className="h-3 w-3 mr-1" />Send
                            </Button>
                          )}
                          {item.status === "pending" && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => cancelItem(item.id)}>
                              <XCircle className="h-3 w-3 mr-1" />Cancel
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
        <h2 className="text-sm font-medium mb-3">Recent Activity</h2>
        <Card className="border shadow-sm">
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <p className="text-sm">No automations logged yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead><TableHead>Lead</TableHead><TableHead>Template</TableHead>
                    <TableHead>Mobile</TableHead><TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log: any) => (
                    <TableRow key={log.id} className={log.status === "failed" ? "bg-destructive/5" : ""}>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.fired_at ? formatDistanceToNow(new Date(log.fired_at), { addSuffix: true }) : "—"}
                      </TableCell>
                      <TableCell>
                        {log.lead_id ? (
                          <Link to={`/leads/${log.lead_id}`} className="text-xs text-primary hover:underline">
                            {(log.leads as any)?.name || "Lead"}
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-xs">{log.template_name || formatLabel(log.trigger_event)}</TableCell>
                      <TableCell className="text-xs font-mono">{log.recipient_mobile || "—"}</TableCell>
                      <TableCell>{statusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 4: Settings */}
      <div>
        <h2 className="text-sm font-medium mb-3">Automation Settings</h2>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          <Card className="border-border/50 shadow-none col-span-2">
            <CardContent className="p-4">
              <Label className="text-xs text-muted-foreground">AiSensy API Key</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={getOrDefault("aisensy_api_key")}
                    onChange={(e) => setSettingValues(p => ({ ...p, aisensy_api_key: e.target.value }))}
                    className="pr-9"
                  />
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button size="sm" onClick={() => saveSetting("aisensy_api_key", getOrDefault("aisensy_api_key"))}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
              </div>
            </CardContent>
          </Card>

          {[
            { key: "review_link", label: "Google Review Link", type: "text" },
            { key: "pre_trip_reminder_days", label: "Pre-trip Reminder Days", type: "number", help: "Days before travel" },
            { key: "safe_journey_hour", label: "Safe Journey Hour (0-23)", type: "number", help: "7 = 7:00 AM IST" },
            { key: "review_request_hour", label: "Review Request Hour (0-23)", type: "number", help: "10 = 10:00 AM IST" },
          ].map((s) => (
            <Card key={s.key} className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <Label className="text-xs text-muted-foreground">{s.label}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type={s.type}
                    value={getOrDefault(s.key)}
                    onChange={(e) => setSettingValues(p => ({ ...p, [s.key]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => saveSetting(s.key, getOrDefault(s.key))}><Save className="h-3.5 w-3.5" /></Button>
                </div>
                {s.help && <p className="text-[10px] text-muted-foreground mt-1">{s.help}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Automations;
