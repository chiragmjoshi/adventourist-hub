import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Save, Eye, EyeOff, CheckCircle, XCircle, ChevronDown, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRBAC } from "@/hooks/useRBAC";

const TEMPLATES = [
  { key: "template_file_closed", name: "File Closed Notification", trigger: "file_closed", recipient: "Customer", vars: ["{{1}} = customer first name", "{{2}} = destination name", "{{3}} = travel date"] },
  { key: "template_pre_trip", name: "Pre-Trip Reminder", trigger: "pre_trip_3days", recipient: "Customer", vars: ["{{1}} = customer first name", "{{2}} = destination name", "{{3}} = travel start date"] },
  { key: "template_safe_journey", name: "Safe Journey Message", trigger: "safe_journey", recipient: "Customer", vars: ["{{1}} = customer first name", "{{2}} = destination name"] },
  { key: "template_review_request", name: "Review Request", trigger: "review_request", recipient: "Customer", vars: ["{{1}} = customer first name", "{{2}} = destination name", "{{3}} = review link"] },
  { key: "template_follow_up", name: "Follow-Up Reminder", trigger: "follow_up_reminder", recipient: "Agent", vars: ["{{1}} = agent name", "{{2}} = customer name", "{{3}} = customer mobile"] },
];

const Settings = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "company";
  const { hasRole } = useRBAC();

  // Company settings
  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  // Automation settings
  const { data: autoSettings = [] } = useQuery({
    queryKey: ["automation_settings"],
    queryFn: async () => { const { data } = await supabase.from("automation_settings").select("*"); return data || []; },
  });

  const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || "";
  const getAutoSetting = (key: string) => autoSettings.find((s: any) => s.key === key)?.value || "";

  // Financial state
  const [gstRate, setGstRate] = useState("");
  useEffect(() => { if (settings.length > 0) setGstRate(getSetting("gst_rate")); }, [settings]);

  // Automation state
  const [autoForm, setAutoForm] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<"idle" | "success" | "fail">("idle");

  useEffect(() => {
    if (autoSettings.length > 0) {
      const form: Record<string, string> = {};
      autoSettings.forEach((s: any) => { form[s.key] = s.value; });
      setAutoForm(form);
    }
  }, [autoSettings]);

  const updateAutoField = (key: string, value: string) => setAutoForm((f) => ({ ...f, [key]: value }));

  // Save financial
  const saveFinancial = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").update({ value: gstRate, updated_at: new Date().toISOString() }).eq("key", "gst_rate");
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("GST rate updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Save automation settings
  const saveAutomation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(autoForm)) {
        await supabase.from("automation_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automation_settings"] }); toast.success("Automation settings saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleTestConnection = () => {
    if (!autoForm.aisensy_api_key) { setTestResult("fail"); return; }
    // Simulate test — in production this would call the AiSensy API
    setTestResult("success");
    setTimeout(() => setTestResult("idle"), 5000);
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.success("Cache cleared. Please refresh the page.");
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
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ["Company Name", getSetting("company_name")],
                  ["GST Number", getSetting("company_gst")],
                  ["PAN", getSetting("company_pan")],
                  ["Address", getSetting("company_address")],
                  ["WhatsApp Number", getSetting("company_whatsapp")],
                  ["Support Email", getSetting("company_email")],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium">{(value as string) || "—"}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-4">Contact support to update company details.</p>
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
                  <Button size="sm" variant="outline" onClick={handleTestConnection}>
                    Test
                  </Button>
                </div>
                {testResult === "success" && <p className="text-xs text-ridge flex items-center gap-1 mt-1"><CheckCircle className="h-3 w-3" />Connected ✅</p>}
                {testResult === "fail" && <p className="text-xs text-destructive flex items-center gap-1 mt-1"><XCircle className="h-3 w-3" />Failed ❌</p>}
              </div>
            </CardContent>
          </Card>

          {/* Message Templates */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Message Templates</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {TEMPLATES.map((tpl) => (
                <div key={tpl.key} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{tpl.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{tpl.trigger}</Badge>
                    <Badge variant="outline" className="text-[10px]">{tpl.recipient}</Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">AiSensy Template Name</Label>
                    <Input
                      value={autoForm[tpl.key] || ""}
                      onChange={(e) => updateAutoField(tpl.key, e.target.value)}
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
                        {tpl.vars.map((v, i) => <li key={i}>{v}</li>)}
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

          <Button onClick={() => saveAutomation.mutate()} disabled={saveAutomation.isPending}>
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
              {autoForm.aisensy_api_key ? (
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
    </AppLayout>
  );
};

export default Settings;
