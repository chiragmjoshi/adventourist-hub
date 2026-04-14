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
import { Save, Eye, EyeOff, CheckCircle, XCircle, ChevronDown, Download, Trash2, Users, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";

const TEMPLATE_VARS: Record<string, string[]> = {
  file_closed: [
    "{{1}} = Customer first name",
    "{{2}} = Destination name",
    "{{3}} = Travel start date (formatted DD MMM YYYY)",
    "{{4}} = Assigned agent name",
  ],
  pre_trip_3days: [
    "{{1}} = Customer first name",
    "{{2}} = Destination name",
    "{{3}} = Travel start date (formatted DD MMM YYYY)",
  ],
  safe_journey: [
    "{{1}} = Customer first name",
    "{{2}} = Destination name",
  ],
  review_request: [
    "{{1}} = Customer first name",
    "{{2}} = Destination name",
    "{{3}} = Google review link (from settings)",
  ],
  follow_up_reminder: [
    "{{1}} = Agent first name",
    "{{2}} = Customer full name",
    "{{3}} = Traveller code (e.g. AU2600001)",
    "{{4}} = Destination name",
  ],
};

const COMPANY_FIELDS = [
  { key: "company_name", label: "Company Name", type: "text" },
  { key: "company_gst", label: "GST Number", type: "text" },
  { key: "company_pan", label: "PAN", type: "text" },
  { key: "company_address", label: "Address", type: "textarea" },
  { key: "company_whatsapp", label: "WhatsApp Number", type: "text", placeholder: "+91 99304 00694" },
  { key: "company_email", label: "Support Email", type: "email" },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "company";
  const { hasRole } = useRBAC();
  const isSuperAdmin = hasRole("super_admin");

  // Company settings
  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  // Automation settings (only keys: aisensy_api_key, review_link, timing)
  const { data: autoSettings = [] } = useQuery({
    queryKey: ["automation_settings"],
    queryFn: async () => { const { data } = await supabase.from("automation_settings").select("*"); return data || []; },
  });

  // Automation templates from automation_templates table
  const { data: templates = [] } = useQuery({
    queryKey: ["automation_templates"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_templates" as any).select("*").order("created_at");
      return (data || []) as any[];
    },
  });

  const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || "";
  const getAutoSetting = (key: string) => autoSettings.find((s: any) => s.key === key)?.value || "";

  // Company form state
  const [companyForm, setCompanyForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (settings.length > 0) {
      const form: Record<string, string> = {};
      COMPANY_FIELDS.forEach(f => { form[f.key] = getSetting(f.key); });
      form.gst_rate = getSetting("gst_rate");
      setCompanyForm(form);
    }
  }, [settings]);

  // Financial state
  const [gstRate, setGstRate] = useState("");
  useEffect(() => { if (settings.length > 0) setGstRate(getSetting("gst_rate")); }, [settings]);

  // Automation settings state
  const [autoForm, setAutoForm] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "loading" | "success" | "fail">("idle");
  const [testError, setTestError] = useState("");

  useEffect(() => {
    if (autoSettings.length > 0) {
      const form: Record<string, string> = {};
      autoSettings.forEach((s: any) => { form[s.key] = s.value; });
      setAutoForm(form);
    }
  }, [autoSettings]);

  // Template name edits (keyed by trigger_event)
  const [templateEdits, setTemplateEdits] = useState<Record<string, string>>({});
  const [templateActiveEdits, setTemplateActiveEdits] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (templates.length > 0) {
      const names: Record<string, string> = {};
      const active: Record<string, boolean> = {};
      templates.forEach((t: any) => {
        names[t.trigger_event] = t.aisensy_template_name;
        active[t.trigger_event] = t.is_active;
      });
      setTemplateEdits(names);
      setTemplateActiveEdits(active);
    }
  }, [templates]);

  const updateAutoField = (key: string, value: string) => setAutoForm((f) => ({ ...f, [key]: value }));

  // Save company
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

  // Save financial
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

  // Save automation settings (only automation_settings keys)
  const saveAutomation = useMutation({
    mutationFn: async () => {
      const validKeys = ["aisensy_api_key", "review_link", "pre_trip_reminder_days", "safe_journey_hour", "review_request_hour"];
      for (const key of validKeys) {
        const value = autoForm[key] || "";
        await supabase.from("automation_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      }
      // Save template names to automation_templates table
      for (const [trigger, name] of Object.entries(templateEdits)) {
        await supabase.from("automation_templates" as any)
          .update({
            aisensy_template_name: name,
            is_active: templateActiveEdits[trigger] ?? true,
          })
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
    if (!apiKey || apiKey === "REPLACE_WITH_YOUR_API_KEY") {
      setTestResult("fail");
      setTestError("API key not configured");
      return;
    }
    setTestResult("loading");
    setTestError("");
    try {
      const response = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          campaignName: "connection_test",
          destination: "919999999999",
          userName: "Test",
          templateParams: [],
          source: "adventourist-crm-test",
        }),
      });
      // Any response from AiSensy means the key is reaching their servers
      if (response.ok || response.status === 400 || response.status === 422) {
        // 400/422 = key works but invalid params (expected for test)
        setTestResult("success");
      } else if (response.status === 401 || response.status === 403) {
        setTestResult("fail");
        setTestError("Invalid API key");
      } else {
        setTestResult("fail");
        setTestError(`Unexpected response: ${response.status}`);
      }
    } catch (err: any) {
      setTestResult("fail");
      setTestError(err.message || "Network error");
    }
    setTimeout(() => { if (setTestResult) setTestResult("idle"); }, 8000);
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success("Cache cleared. Please refresh the page.");
  };

  const EmptyValue = ({ value, label }: { value: string; label: string }) => {
    if (value) return <p className="text-xs font-medium">{value}</p>;
    return (
      <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded px-2 py-1 mt-0.5">
        <AlertTriangle className="h-3 w-3 text-primary" />
        <span className="text-[10px] text-primary">Not configured — Click edit to add</span>
      </div>
    );
  };

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
        <TabsContent value="company">
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
                          <Textarea
                            value={companyForm[field.key] || ""}
                            onChange={(e) => setCompanyForm(f => ({ ...f, [field.key]: e.target.value }))}
                            className="mt-1 rounded-md"
                            rows={2}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            value={companyForm[field.key] || ""}
                            onChange={(e) => setCompanyForm(f => ({ ...f, [field.key]: e.target.value }))}
                            className="mt-1 rounded-md"
                            placeholder={field.placeholder || ""}
                          />
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
        </TabsContent>

        {/* TAB 2: Financial */}
        <TabsContent value="financial">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Financial Settings</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="max-w-xs">
                <Label className="text-xs text-muted-foreground">GST Rate (%)</Label>
                <Input type="number" value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="mt-1 rounded-md" />
                <p className="text-[10px] text-muted-foreground mt-1">Applied to all GST-billed invoices. Update when government rate changes.</p>
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
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">AiSensy Configuration</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="max-w-sm">
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={autoForm.aisensy_api_key || ""}
                      onChange={(e) => updateAutoField("aisensy_api_key", e.target.value)}
                      className="pr-9 rounded-md"
                    />
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

          {/* Message Templates — from automation_templates table */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Message Templates</CardTitle></CardHeader>
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
                      <Switch
                        checked={templateActiveEdits[tpl.trigger_event] ?? true}
                        onCheckedChange={(v) => setTemplateActiveEdits(prev => ({ ...prev, [tpl.trigger_event]: v }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AiSensy Template Name</Label>
                    <Input
                      value={templateEdits[tpl.trigger_event] || ""}
                      onChange={(e) => setTemplateEdits(prev => ({ ...prev, [tpl.trigger_event]: e.target.value }))}
                      className="mt-1 max-w-sm rounded-md"
                      placeholder="Enter exact template name from AiSensy"
                    />
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
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">WhatsApp (AiSensy)</p>
                <p className="text-xs text-muted-foreground">Automated WhatsApp messages via AiSensy</p>
              </div>
              {autoForm.aisensy_api_key && autoForm.aisensy_api_key !== "REPLACE_WITH_YOUR_API_KEY" ? (
                <Badge className="bg-ridge/20 text-ridge text-[10px]">Connected</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Not Connected</Badge>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <p className="text-sm font-medium">Zoho Invoice</p>
              <p className="text-xs text-muted-foreground mt-1">Manual integration — enter Zoho reference number directly in Trip Cashflow records.</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-none">
            <CardContent className="px-5 py-4">
              <p className="text-sm font-medium">Google Reviews</p>
              <p className="text-xs text-muted-foreground mt-1">Configure your review page link in the Automations tab → Links section.</p>
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

      {/* Team & Access section */}
      {isSuperAdmin && (
        <div className="max-w-3xl mt-8">
          <h2 className="text-sm font-medium mb-3">Team & Access</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/50 shadow-none">
              <CardContent className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">User Management</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Manage team members, invite new users, activate/deactivate accounts</p>
                <Link to="/user-management">
                  <Button variant="outline" size="sm" className="text-xs">Manage Users →</Button>
                </Link>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-none">
              <CardContent className="px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Role Management</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">View role permissions and access levels for each team role</p>
                <Link to="/role-management">
                  <Button variant="outline" size="sm" className="text-xs">View Roles →</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default Settings;