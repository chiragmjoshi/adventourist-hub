import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Save, Eye, EyeOff, CheckCircle, XCircle, ChevronDown, Download, Trash2, Users, Shield, AlertTriangle, Loader2, Mail, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";
import { useAuth } from "@/contexts/AuthContext";

const TEMPLATE_VARS: Record<string, string[]> = {
  file_closed: ["{{1}} = Customer first name", "{{2}} = Destination name", "{{3}} = Travel start date (formatted DD MMM YYYY)", "{{4}} = Assigned agent name"],
  pre_trip_3days: ["{{1}} = Customer first name", "{{2}} = Destination name", "{{3}} = Travel start date (formatted DD MMM YYYY)"],
  safe_journey: ["{{1}} = Customer first name", "{{2}} = Destination name"],
  review_request: ["{{1}} = Customer first name", "{{2}} = Destination name", "{{3}} = Google review link (from settings)"],
  follow_up_reminder: ["{{1}} = Agent first name", "{{2}} = Customer full name", "{{3}} = Traveller code (e.g. AU2600001)", "{{4}} = Destination name"],
};

const COMPANY_FIELDS = [
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "company_gst", label: "GST Number", type: "text" },
  { key: "company_pan", label: "PAN", type: "text" },
  { key: "company_address", label: "Address", type: "textarea" },
  { key: "company_whatsapp", label: "WhatsApp Number", type: "text", placeholder: "+91 99304 00694" },
  { key: "company_email", label: "Support Email", type: "email" },
  { key: "company_website", label: "Website URL", type: "text", placeholder: "https://adventourist.in" },
  { key: "company_founded", label: "Founded Year", type: "text", placeholder: "2019" },
  { key: "company_team_size", label: "Team Size", type: "text", placeholder: "5-10" },
];

const EMAIL_FIELDS = [
  { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.gmail.com" },
  { key: "smtp_port", label: "SMTP Port", type: "number", placeholder: "587" },
  { key: "smtp_username", label: "SMTP Username", type: "text", placeholder: "" },
  { key: "smtp_password", label: "SMTP Password", type: "password", placeholder: "" },
  { key: "email_from_name", label: "From Name", type: "text", placeholder: "Adventourist" },
  { key: "email_from_address", label: "From Email", type: "email", placeholder: "hello@adventourist.in" },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "company";
  const { hasRole } = useRBAC();
  const { profile } = useAuth();
  const isSuperAdmin = hasRole("super_admin");

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  const { data: autoSettings = [] } = useQuery({
    queryKey: ["automation_settings"],
    queryFn: async () => { const { data } = await supabase.from("automation_settings").select("*"); return data || []; },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["automation_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_templates" as any).select("*").order("created_at");
      return (data || []) as any[];
    },
  });

  // Stats for integrations tab
  const { data: logStats } = useQuery({
    queryKey: ["automation_log_stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const [{ count: waToday }, { count: waMonth }] = await Promise.all([
        supabase.from("automations_log").select("*", { count: "exact", head: true }).eq("channel", "whatsapp").gte("fired_at", today.toISOString()),
        supabase.from("automations_log").select("*", { count: "exact", head: true }).eq("channel", "whatsapp").gte("fired_at", monthStart.toISOString()),
      ]);
      return { waToday: waToday || 0, waMonth: waMonth || 0 };
    },
  });

  const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || "";
  const getAutoSetting = (key: string) => autoSettings.find((s: any) => s.key === key)?.value || "";

  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.length > 0) {
      const form: Record<string, string> = {};
      COMPANY_FIELDS.forEach(f => { form[f.key] = getSetting(f.key); });
      form.gst_rate = getSetting("gst_rate");
      setCompanyForm(form);
    }
  }, [settings]);

  const [gstRate, setGstRate] = useState("");
  useEffect(() => { if (settings.length > 0) setGstRate(getSetting("gst_rate")); }, [settings]);

  const [autoForm, setAutoForm] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "fail">("idle");
  const [testError, setTestError] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);

  useEffect(() => {
    if (autoSettings.length > 0) {
      const form: Record<string, string> = {};
      autoSettings.forEach((s: any) => { form[s.key] = s.value; });
      setAutoForm(form);
    }
  }, [autoSettings]);

  const [templateEdits, setTemplateEdits] = useState<Record<string, string>>({});
  const [templateActiveEdits, setTemplateActiveEdits] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (templates.length > 0) {
      const names: Record<string, string> = {};
      const active: Record<string, boolean> = {};
      templates.forEach((t: any) => { names[t.trigger_event] = t.aisensy_template_name; active[t.trigger_event] = t.is_active; });
      setTemplateEdits(names);
      setTemplateActiveEdits(active);
    }
  }, [templates]);

  const updateAutoField = (key: string, value: string) => setAutoForm((f) => ({ ...f, [key]: value }));

  const saveCompany = useMutation({
    mutationFn: async () => {
      for (const field of COMPANY_FIELDS) {
        const val = companyForm[field.key] || "";
        const existing = settings.find((s: any) => s.key === field.key);
        if (existing) {
          await supabase.from("settings").update({ value: val, updated_at: new Date().toISOString() }).eq("key", field.key);
        } else {
          await supabase.from("settings").insert({ key: field.key, value: val, description: field.label });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("Company details saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveFinancial = useMutation({
    mutationFn: async () => {
      const existing = settings.find((s: any) => s.key === "gst_rate");
      if (existing) {
        const { error } = await supabase.from("settings").update({ value: gstRate, updated_at: new Date().toISOString() }).eq("key", "gst_rate");
        if (error) throw error;
      } else {
        const { error } = await supabase.from("settings").insert({ key: "gst_rate", value: gstRate, description: "GST Rate (%)" });
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("GST rate updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveAutomation = useMutation({
    mutationFn: async () => {
      const validKeys = ["aisensy_api_key", "review_link", "pre_trip_reminder_days", "safe_journey_hour", "review_request_hour", "smtp_host", "smtp_port", "smtp_username", "smtp_password", "email_from_name", "email_from_address"];
      for (const key of validKeys) {
        const value = autoForm[key] || "";
        const { data: existing } = await supabase.from("automation_settings").select("id").eq("key", key).maybeSingle();
        if (existing) {
          await supabase.from("automation_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
        } else {
          await supabase.from("automation_settings").insert({ key, value, description: key.replace(/_/g, " ") });
        }
      }
      for (const [trigger, name] of Object.entries(templateEdits)) {
        await supabase.from("automation_templates" as any)
          .update({ aisensy_template_name: name, is_active: templateActiveEdits[trigger] ?? true })
          .eq("trigger_event", trigger);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_settings"] });
      queryClient.invalidateQueries({ queryKey: ["automation_templates"] });
      toast.success("Automation settings saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleTestConnection = async () => {
    const apiKey = autoForm.aisensy_api_key;
    if (!apiKey || apiKey === "REPLACE_WITH_YOUR_API_KEY") { setTestResult("fail"); setTestError("API key not configured"); return; }
    setTestResult("loading"); setTestError("");
    try {
      const { testWhatsAppConnection } = await import("@/services/aisensy");
      const res = await testWhatsAppConnection(apiKey);
      if (res.success) setTestResult("success");
      else { setTestResult("fail"); setTestError(res.error || "Test failed"); }
    } catch (err: any) { setTestResult("fail"); setTestError(err.message || "Network error"); }
    setTimeout(() => setTestResult("idle"), 8000);
  };

  const handleClearCache = () => { localStorage.clear(); toast.success("Cache cleared. Please refresh the page."); };

  const EmptyValue = ({ value, label }: { value: string; label: string }) => {
    if (value) return <p className="text-xs font-medium">{value}</p>;
    return (
      <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded px-2 py-1 mt-0.5">
        <AlertTriangle className="h-3 w-3 text-primary" />
        <span className="text-[10px] text-primary">Not configured</span>
      </div>
    );
  };

  const isWhatsAppConnected = !!(autoForm.aisensy_api_key && autoForm.aisensy_api_key !== "REPLACE_WITH_YOUR_API_KEY");
  const isSmtpConfigured = !!(autoForm.smtp_host && autoForm.smtp_username);

  return (
    <AppLayout title="Settings">
      <h1 className="text-xl font-semibold mb-5">Settings</h1>

      <Tabs defaultValue={defaultTab} className="max-w-3xl">
        <TabsList className="mb-4">
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* TAB 1: Company */}
        <TabsContent value="company" className="space-y-6">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Company Information</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {isSuperAdmin ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {COMPANY_FIELDS.map((field) => (
                      <div key={field.key} className={field.type === "textarea" ? "col-span-2" : ""}>
                        <Label className="text-xs text-muted-foreground">{field.label}</Label>
                        {field.type === "textarea" ? (
                          <Textarea value={companyForm[field.key] || ""} onChange={(e) => setCompanyForm(f => ({ ...f, [field.key]: e.target.value }))} className="mt-1 rounded-md" rows={2} />
                        ) : (
                          <Input type={field.type} value={companyForm[field.key] || ""} onChange={(e) => setCompanyForm(f => ({ ...f, [field.key]: e.target.value }))} className="mt-1 rounded-md" placeholder={(field as any).placeholder || ""} />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" className="rounded-md text-xs bg-primary hover:bg-primary/90" onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1" />Save Company Details
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    {COMPANY_FIELDS.map((field) => (
                      <div key={field.key}>
                        <p className="text-[10px] text-muted-foreground">{field.label}</p>
                        <EmptyValue value={getSetting(field.key)} label={field.label} />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-4 italic">Read only for your role. Contact a super admin to update.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team & Access — ONLY on Company tab */}
          {isSuperAdmin && (
            <div>
              <h2 className="text-sm font-medium mb-3">Team & Access</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50 shadow-none">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">User Management</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Manage team members, invite new users, activate/deactivate accounts</p>
                    <Link to="/admin/user-management"><Button variant="outline" size="sm" className="text-xs">Manage Users →</Button></Link>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-none">
                  <CardContent className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">Role Management</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">View role permissions and access levels for each team role</p>
                    <Link to="/admin/role-management"><Button variant="outline" size="sm" className="text-xs">View Roles →</Button></Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Financial */}
        <TabsContent value="financial">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Financial Settings</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="max-w-xs">
                <Label className="text-xs text-muted-foreground">GST Rate (%)</Label>
                <Input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="mt-1 rounded-md" />
                <p className="text-[10px] text-muted-foreground mt-1">Applied to all GST-billed invoices.</p>
              </div>
              <Button size="sm" className="rounded-md text-xs" onClick={() => saveFinancial.mutate()} disabled={saveFinancial.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" />Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Automations */}
        <TabsContent value="automations" className="space-y-5">
          {/* AiSensy Config */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">WhatsApp — AiSensy Configuration</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="max-w-sm">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input type={showApiKey ? "text" : "password"} value={autoForm.aisensy_api_key || ""} onChange={(e) => updateAutoField("aisensy_api_key", e.target.value)} className="pr-9 rounded-md" />
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowApiKey(!showApiKey)}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={testResult === "loading"}>
                    {testResult === "loading" ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Testing...</> : "Test Connection"}
                  </Button>
                </div>
                {testResult === "success" && <p className="text-xs text-ridge flex items-center gap-1 mt-1"><CheckCircle className="h-3 w-3" />Connected ✅</p>}
                {testResult === "fail" && (
                  <div>
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1"><XCircle className="h-3 w-3" />Connection failed ❌</p>
                    {testError && <p className="text-[10px] text-destructive/80 mt-0.5">{testError}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Email Configuration */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4" />Email — SMTP Configuration</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                {EMAIL_FIELDS.map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs text-muted-foreground">{field.label}</Label>
                    {field.type === "password" ? (
                      <div className="relative mt-1">
                        <Input
                          type={showSmtpPassword ? "text" : "password"}
                          value={autoForm[field.key] || ""}
                          onChange={(e) => updateAutoField(field.key, e.target.value)}
                          className="pr-9 rounded-md"
                          placeholder={field.placeholder}
                        />
                        <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowSmtpPassword(!showSmtpPassword)}>
                          {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    ) : (
                      <Input
                        type={field.type}
                        value={autoForm[field.key] || ""}
                        onChange={(e) => updateAutoField(field.key, e.target.value)}
                        className="mt-1 rounded-md"
                        placeholder={field.placeholder}
                      />
                    )}
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={smtpTesting || !isSmtpConfigured}
                onClick={async () => {
                  if (!isSmtpConfigured) {
                    toast.error("Please fill SMTP Host and Username, then click Save before testing.");
                    return;
                  }
                  setSmtpTesting(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("send-test-email", {
                      body: { to: profile?.email },
                    });
                    if (error) throw error;
                    if ((data as any)?.error) throw new Error((data as any).error);
                    toast.success(`Test email sent to ${(data as any)?.to || profile?.email}`);
                  } catch (e: any) {
                    toast.error(e?.message || "Failed to send test email");
                  } finally {
                    setSmtpTesting(false);
                  }
                }}
              >
                {smtpTesting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                {smtpTesting ? "Sending…" : "Send Test Email"}
              </Button>
              {!isSmtpConfigured && (
                <p className="text-[11px] text-muted-foreground">Fill SMTP Host and Username above, then click Save to enable the test.</p>
              )}
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">WhatsApp Message Templates</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {templates.map((tpl: any) => (
                <div key={tpl.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{tpl.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{tpl.trigger_event}</Badge>
                      <Badge variant="outline" className="text-[10px]">{tpl.recipient_type === "agent" ? "Agent" : "Customer"}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{templateActiveEdits[tpl.trigger_event] ? "Active" : "Inactive"}</span>
                      <Switch checked={templateActiveEdits[tpl.trigger_event] ?? true} onCheckedChange={(v) => setTemplateActiveEdits(prev => ({ ...prev, [tpl.trigger_event]: v }))} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AiSensy Template Name</Label>
                    <Input value={templateEdits[tpl.trigger_event] || ""} onChange={(e) => setTemplateEdits(prev => ({ ...prev, [tpl.trigger_event]: e.target.value }))} className="mt-1 max-w-sm rounded-md" placeholder="Enter exact template name from AiSensy" />
                  </div>
                  <Collapsible>
                    <CollapsibleTrigger className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
                      <ChevronDown className="h-3 w-3" />Variable reference
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1 bg-muted/50 rounded p-2">
                      <ul className="text-xs text-muted-foreground space-y-0.5">
                        {(TEMPLATE_VARS[tpl.trigger_event] || []).map((v: string, i: number) => <li key={i}>{v}</li>)}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Timing Settings */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Timing Settings</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">Pre-trip Reminder (days before)</Label>
                  <Input type="number" value={autoForm.pre_trip_reminder_days || "3"} onChange={(e) => updateAutoField("pre_trip_reminder_days", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Safe Journey Hour (0-23)</Label>
                  <Input type="number" min={0} max={23} value={autoForm.safe_journey_hour || "7"} onChange={(e) => updateAutoField("safe_journey_hour", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Review Request Hour (0-23)</Label>
                  <Input type="number" min={0} max={23} value={autoForm.review_request_hour || "10"} onChange={(e) => updateAutoField("review_request_hour", e.target.value)} className="mt-1 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Links */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Links</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="max-w-sm">
                <Label className="text-xs text-muted-foreground">Google Review Link</Label>
                <Input value={autoForm.review_link || ""} onChange={(e) => updateAutoField("review_link", e.target.value)} className="mt-1 rounded-md" placeholder="https://g.page/..." />
                <p className="text-[10px] text-muted-foreground mt-1">Sent in review request message</p>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => saveAutomation.mutate()} disabled={saveAutomation.isPending} className="bg-primary hover:bg-primary/90">
            <Save className="h-4 w-4 mr-2" />Save All Automation Settings
          </Button>
        </TabsContent>

        {/* TAB 4: Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          {/* WhatsApp */}
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-lg">📱</div>
                  <div>
                    <p className="text-sm font-medium">WhatsApp (AiSensy)</p>
                    <p className="text-xs text-muted-foreground">Automated WhatsApp messages via AiSensy</p>
                  </div>
                </div>
                <div className="text-right">
                  {isWhatsAppConnected ? (
                    <Badge className="bg-ridge/20 text-ridge text-[10px]">Connected ✅</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Not Connected</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex gap-6">
                  <div><p className="text-lg font-bold">{logStats?.waToday || 0}</p><p className="text-[10px] text-muted-foreground">Sent today</p></div>
                  <div><p className="text-lg font-bold">{logStats?.waMonth || 0}</p><p className="text-[10px] text-muted-foreground">This month</p></div>
                </div>
                <Link to="/admin/settings?tab=automations"><Button variant="outline" size="sm" className="text-xs">Configure →</Button></Link>
              </div>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-lg">📧</div>
                  <div>
                    <p className="text-sm font-medium">Email (SMTP)</p>
                    <p className="text-xs text-muted-foreground">Transactional emails via SMTP</p>
                  </div>
                </div>
                {isSmtpConfigured ? (
                  <Badge className="bg-ridge/20 text-ridge text-[10px]">Connected ✅</Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">Not Connected</Badge>
                )}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t">
                <Link to="/admin/settings?tab=automations"><Button variant="outline" size="sm" className="text-xs">Configure →</Button></Link>
              </div>
            </CardContent>
          </Card>

          {/* Zoho */}
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-lg">📋</div>
                <div>
                  <p className="text-sm font-medium">Zoho Invoice</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5">Manual Integration</Badge>
                </div>
              </div>
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-primary flex items-center gap-1 mt-3 hover:underline">
                  How it works <ChevronDown className="h-3 w-3" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 bg-muted/30 rounded p-3">
                  <p className="text-xs text-muted-foreground">Enter Zoho reference numbers manually in Trip Cashflow records. The reference is stored and can be used for reconciliation.</p>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Google Reviews */}
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center text-lg">⭐</div>
                  <div>
                    <p className="text-sm font-medium">Google Reviews</p>
                    <p className="text-xs text-muted-foreground truncate max-w-xs">{getAutoSetting("review_link") || "Not configured"}</p>
                  </div>
                </div>
                <Link to="/admin/settings?tab=automations"><Button variant="outline" size="sm" className="text-xs">Change Link →</Button></Link>
              </div>
            </CardContent>
          </Card>

          {/* SMS */}
          <Card className="border-border/50 shadow-none opacity-60">
            <CardContent className="px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-lg">💬</div>
                <div>
                  <p className="text-sm font-medium">SMS</p>
                  <Badge variant="secondary" className="text-[10px] mt-0.5">Coming Soon</Badge>
                  <p className="text-xs text-muted-foreground mt-1">We'll support SMS via Twilio/MSG91 soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: System */}
        <TabsContent value="system" className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4 space-y-3">
              <div className="flex justify-between">
                <div><p className="text-[10px] text-muted-foreground">App Version</p><p className="text-xs font-medium">1.0.0</p></div>
                <div><p className="text-[10px] text-muted-foreground">Database Status</p><Badge className="bg-ridge/20 text-ridge text-[10px]">Connected</Badge></div>
              </div>
            </CardContent>
          </Card>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Clear Cache
            </Button>
            {hasRole("super_admin") && (
              <Button variant="outline" size="sm" onClick={() => toast.info("Export feature coming soon")}>
                <Download className="h-3.5 w-3.5 mr-1.5" />Export All Data
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
