import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ChevronRight, Save, Plus, Trash2, Upload, GripVertical, Check } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/formatINR";
// Travel-date based automations are now scheduled by the rule engine cron

interface VendorLine {
  id?: string;
  vendor_id: string;
  service_type: string;
  description: string;
  cost_per_pax_incl_gst: number;
  invoice_url: string;
  sort_order: number;
}

const emptyLine = (order: number): VendorLine => ({
  vendor_id: "", service_type: "", description: "", cost_per_pax_incl_gst: 0, invoice_url: "", sort_order: order,
});

const TripCashflowEdit = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("lead_id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isNew = !id || id === "new";
  const [activeTab, setActiveTab] = useState("client");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [form, setForm] = useState({
    traveller_name: "", traveller_code: "", destination_id: "", itinerary_id: "",
    travel_start_date: "", travel_end_date: "", booking_date: "",
    pax_count: 1, gst_billing: true, margin_percent: 0, status: "draft",
    assigned_to: "", lead_id: "", pan_card_url: "", zoho_invoice_ref: "", notes: "",
  });

  const [vendorLines, setVendorLines] = useState<VendorLine[]>([]);
  const [additionalDocs, setAdditionalDocs] = useState<string[]>([]);

  // Queries
  const { data: existing } = useQuery({
    queryKey: ["cashflow", id], enabled: !isNew,
    queryFn: async () => { const { data, error } = await supabase.from("trip_cashflow").select("*").eq("id", id!).single(); if (error) throw error; return data; },
  });

  const { data: existingLines = [] } = useQuery({
    queryKey: ["cashflow_lines", id], enabled: !isNew,
    queryFn: async () => { const { data } = await supabase.from("trip_cashflow_vendors").select("*").eq("cashflow_id", id!).order("sort_order"); return data || []; },
  });

  const { data: lead } = useQuery({
    queryKey: ["lead_for_cf", leadId], enabled: !!leadId && isNew,
    queryFn: async () => { const { data } = await supabase.from("leads").select("*").eq("id", leadId!).single(); return data; },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => { const { data } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name"); return data || []; },
  });

  const { data: itineraries = [] } = useQuery({
    queryKey: ["itineraries_active"],
    queryFn: async () => { const { data } = await supabase.from("itineraries").select("id, headline, destination_id").order("headline"); return data || []; },
  });

  const { data: usersData = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const { data } = await supabase.from("users").select("id, name"); return data || []; },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors_active"],
    queryFn: async () => { const { data } = await supabase.from("vendors").select("id, name, nick_name, services").eq("is_active", true).order("name"); return data || []; },
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["mv_service_type"],
    queryFn: async () => { const { data } = await supabase.from("master_values").select("value").eq("type", "service_type").eq("is_active", true).order("sort_order"); return data?.map((d: any) => d.value) || []; },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  const gstRate = parseFloat(settings.find((s: any) => s.key === "gst_rate")?.value || "5");

  // Load existing
  useEffect(() => {
    if (existing) {
      setForm({
        traveller_name: existing.traveller_name || "",
        traveller_code: existing.traveller_code || "",
        destination_id: existing.destination_id || "",
        itinerary_id: existing.itinerary_id || "",
        travel_start_date: existing.travel_start_date || "",
        travel_end_date: existing.travel_end_date || "",
        booking_date: existing.booking_date || "",
        pax_count: existing.pax_count || 1,
        gst_billing: existing.gst_billing ?? true,
        margin_percent: parseFloat(String(existing.margin_percent)) || 0,
        status: existing.status || "draft",
        assigned_to: existing.assigned_to || "",
        lead_id: existing.lead_id || "",
        pan_card_url: existing.pan_card_url || "",
        zoho_invoice_ref: existing.zoho_invoice_ref || "",
        notes: existing.notes || "",
      });
    }
  }, [existing]);

  useEffect(() => {
    if (existingLines.length > 0) {
      setVendorLines(existingLines.map((l: any) => ({
        id: l.id, vendor_id: l.vendor_id || "", service_type: l.service_type || "",
        description: l.description || "", cost_per_pax_incl_gst: parseFloat(l.cost_per_pax_incl_gst) || 0,
        invoice_url: l.invoice_url || "", sort_order: l.sort_order || 0,
      })));
    }
  }, [existingLines]);

  // Pre-fill from lead
  useEffect(() => {
    if (lead && isNew) {
      setForm(prev => ({
        ...prev,
        traveller_name: lead.name || "",
        traveller_code: lead.traveller_code || "",
        destination_id: lead.destination_id || "",
        itinerary_id: lead.itinerary_id || "",
        assigned_to: lead.assigned_to || "",
        travel_start_date: lead.travel_date || "",
        lead_id: lead.id,
      }));
    }
  }, [lead, isNew]);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const updateLine = (idx: number, updates: Partial<VendorLine>) => {
    setVendorLines(prev => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
  };

  const addLine = () => setVendorLines(prev => [...prev, emptyLine(prev.length)]);
  const removeLine = (idx: number) => setVendorLines(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, sort_order: i })));

  // Calculations
  const vendorCostPerPax = vendorLines.reduce((s, l) => s + (l.cost_per_pax_incl_gst || 0), 0);
  const totalVendorCost = vendorCostPerPax * form.pax_count;
  const marginAmount = totalVendorCost * (form.margin_percent / 100);
  const sellingExGst = totalVendorCost + marginAmount;
  const gstAmount = form.gst_billing ? sellingExGst * (gstRate / 100) : 0;
  const finalPrice = sellingExGst + gstAmount;

  const filteredItineraries = form.destination_id ? itineraries.filter((i: any) => i.destination_id === form.destination_id) : itineraries;

  // Save
  const saveMutation = useMutation({
    mutationFn: async (newStatus?: string) => {
      const status = newStatus || form.status;
      const payload: any = {
        traveller_name: form.traveller_name, traveller_code: form.traveller_code,
        destination_id: form.destination_id || null, itinerary_id: form.itinerary_id || null,
        travel_start_date: form.travel_start_date || null, travel_end_date: form.travel_end_date || null,
        booking_date: form.booking_date || null, pax_count: form.pax_count,
        gst_billing: form.gst_billing, margin_percent: form.margin_percent,
        status, assigned_to: form.assigned_to || null, lead_id: form.lead_id || null,
        pan_card_url: form.pan_card_url || null, zoho_invoice_ref: form.zoho_invoice_ref || null,
        notes: form.notes || null,
      };

      let cashflowId = id;
      if (isNew) {
        payload.cashflow_code = "";
        payload.created_by = user?.id || null;
        const { data, error } = await supabase.from("trip_cashflow").insert(payload).select("id, cashflow_code").single();
        if (error) throw error;
        cashflowId = data.id;

        // Log to lead timeline if from lead
        if (form.lead_id) {
          await supabase.from("lead_timeline").insert({
            lead_id: form.lead_id, actor_id: user?.id || null,
            event_type: "cashflow_created",
            note: `Trip Cashflow ${data.cashflow_code} created`,
          });
        }
      } else {
        const { error } = await supabase.from("trip_cashflow").update(payload).eq("id", id!);
        if (error) throw error;
      }

      // Save vendor lines — delete all and re-insert
      if (cashflowId) {
        await supabase.from("trip_cashflow_vendors").delete().eq("cashflow_id", cashflowId);
        if (vendorLines.length > 0) {
          const lines = vendorLines.map((l, i) => ({
            cashflow_id: cashflowId!, vendor_id: l.vendor_id || null,
            service_type: l.service_type, description: l.description || null,
            cost_per_pax_incl_gst: l.cost_per_pax_incl_gst, invoice_url: l.invoice_url || null,
            sort_order: i,
          }));
          const { error } = await supabase.from("trip_cashflow_vendors").insert(lines);
          if (error) throw error;
        }
      }

      return cashflowId;
    },
    onSuccess: (cfId) => {
      queryClient.invalidateQueries({ queryKey: ["trip_cashflow"] });
      setLastSaved(new Date());
      toast.success("Cashflow saved");
      // Trip-level automations are handled by the new automation engine
      // via lead status changes (no manual queueing needed here).
      if (isNew && cfId) navigate(`/trip-cashflow/edit/${cfId}`, { replace: true });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "completed") {
      setConfirmComplete(true);
    } else {
      setField("status", newStatus);
    }
  };

  const confirmCompleteAction = () => {
    setField("status", "completed");
    saveMutation.mutate("completed");
    setConfirmComplete(false);
  };

  const getDestName = (did: string) => destinations.find((d: any) => d.id === did)?.name || "";

  return (
    <AppLayout title={isNew ? "New Cashflow" : "Edit Cashflow"}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/trip-cashflow")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Trip Cashflow
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{form.traveller_name || "New Cashflow"}</span>
          {existing?.cashflow_code && <span className="font-mono text-xs text-primary ml-2">{existing.cashflow_code}</span>}
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
          <Select value={form.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-32 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(form.status)} disabled={saveMutation.isPending || !form.traveller_name}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Draft
          </Button>
          <Button size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(form.status)} disabled={saveMutation.isPending || !form.traveller_name}>
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </div>
      </div>

      {/* Lead pre-fill banner */}
      {lead && isNew && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-700">Creating cashflow for lead <span className="font-mono font-medium">{lead.traveller_code}</span> — {lead.name}</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none mb-5">
          {[
            { v: "client", l: "Client & Trip" }, { v: "vendors", l: "Vendor Costs" },
            { v: "pricing", l: "Pricing & Margin" }, { v: "docs", l: "Documents & Notes" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Client & Trip */}
        <TabsContent value="client" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Traveller Code</Label>
                  <Input value={form.traveller_code} onChange={e => setField("traveller_code", e.target.value)}
                    readOnly={!!leadId} className={`mt-1 rounded-md font-mono text-xs ${leadId ? "bg-muted/30" : ""}`} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Traveller Name</Label>
                  <Input value={form.traveller_name} onChange={e => setField("traveller_name", e.target.value)}
                    readOnly={!!leadId} className={`mt-1 rounded-md ${leadId ? "bg-muted/30" : ""}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Destination</Label>
                  <Select value={form.destination_id} onValueChange={v => setField("destination_id", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Itinerary</Label>
                  <Select value={form.itinerary_id} onValueChange={v => setField("itinerary_id", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{filteredItineraries.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.headline}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Travel Start Date *</Label>
                  <Input type="date" value={form.travel_start_date} onChange={e => setField("travel_start_date", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Travel End Date *</Label>
                  <Input type="date" value={form.travel_end_date} onChange={e => setField("travel_end_date", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Booking Date *</Label>
                  <Input type="date" value={form.booking_date} onChange={e => setField("booking_date", e.target.value)} className="mt-1 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Pax Count *</Label>
                  <Input type="number" min={1} value={form.pax_count} onChange={e => setField("pax_count", Math.max(1, parseInt(e.target.value) || 1))} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assigned To</Label>
                  <Select value={form.assigned_to} onValueChange={v => setField("assigned_to", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{usersData.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* GST toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/30">
                <div>
                  <p className="text-sm font-medium">GST Billing</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.gst_billing ? `GST @ ${gstRate}% will be applied on selling price` : "Non-GST customer — no GST charged"}
                  </p>
                </div>
                <Switch checked={form.gst_billing} onCheckedChange={v => setField("gst_billing", v)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Vendor Costs */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="mb-2">
            <p className="text-sm font-medium">Vendor Cost Lines</p>
            <p className="text-xs text-muted-foreground">Enter cost per person as per vendor invoice (inclusive of GST)</p>
          </div>

          {vendorLines.map((line, idx) => (
            <Card key={idx} className="border-border/50 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Badge variant="outline" className="text-xs rounded-md">Line {idx + 1}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Service Type</Label>
                    <Select value={line.service_type} onValueChange={v => updateLine(idx, { service_type: v })}>
                      <SelectTrigger className="mt-1 rounded-md text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Vendor</Label>
                    <Select value={line.vendor_id} onValueChange={v => updateLine(idx, { vendor_id: v })}>
                      <SelectTrigger className="mt-1 rounded-md text-xs"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                      <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.nick_name || v.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input value={line.description} onChange={e => updateLine(idx, { description: e.target.value })}
                    className="mt-1 rounded-md text-xs" placeholder="e.g. 3N Taj Hotel Jaipur, deluxe room with breakfast" />
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Cost per Pax incl. GST (₹)</Label>
                  <Input type="number" value={line.cost_per_pax_incl_gst || ""} onChange={e => updateLine(idx, { cost_per_pax_incl_gst: parseFloat(e.target.value) || 0 })}
                    className="mt-1 rounded-md" />
                  <p className="text-[10px] text-muted-foreground mt-1">× {form.pax_count} pax = {formatINR(line.cost_per_pax_incl_gst * form.pax_count)}</p>
                </div>
                <div className="mt-3">
                  {line.invoice_url ? (
                    <div className="flex items-center gap-2 text-xs bg-muted/20 rounded-md p-2 border border-border/30">
                      <span className="truncate flex-1 font-mono">{line.invoice_url.split("/").pop()}</span>
                      <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/cashflow-docs/${line.invoice_url}`} target="_blank" rel="noreferrer"
                        className="text-primary hover:underline text-xs shrink-0">View</a>
                      <button onClick={() => updateLine(idx, { invoice_url: "" })} className="text-destructive hover:underline text-xs shrink-0">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id={`invoice-upload-${idx}`}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
                          const code = existing?.cashflow_code || "new";
                          const path = `${code}/invoices/${Date.now()}_${file.name}`;
                          const { error } = await supabase.storage.from("cashflow-docs").upload(path, file);
                          if (error) { toast.error("Upload failed"); return; }
                          updateLine(idx, { invoice_url: path });
                          toast.success("Invoice uploaded");
                        }} />
                      <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => document.getElementById(`invoice-upload-${idx}`)?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" />Upload Invoice
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {vendorLines.length === 0 && (
            <div className="border-2 border-dashed border-border/50 rounded-lg py-12 text-center">
              <p className="text-sm text-muted-foreground mb-3">No vendor lines yet</p>
              <Button variant="outline" size="sm" onClick={addLine} className="rounded-md"><Plus className="h-3.5 w-3.5 mr-1" />Add your first vendor line</Button>
            </div>
          )}

          {vendorLines.length > 0 && (
            <button onClick={addLine} className="w-full border-2 border-dashed border-border/40 rounded-lg py-3 text-xs text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors">
              <Plus className="h-3.5 w-3.5 inline mr-1" />Add Vendor Line
            </button>
          )}

          {/* Running total */}
          {vendorLines.length > 0 && (
            <Card className="border-border/50 shadow-none bg-muted/20">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Vendor Lines Summary</p>
                {vendorLines.map((l, i) => (
                  <div key={i} className="flex justify-between text-xs py-1">
                    <span>Line {i + 1}: {l.service_type || "—"}</span>
                    <span>{formatINR(l.cost_per_pax_incl_gst)} × {form.pax_count} = {formatINR(l.cost_per_pax_incl_gst * form.pax_count)}</span>
                  </div>
                ))}
                <div className="border-t border-border/40 mt-2 pt-2 flex justify-between text-sm font-medium">
                  <span>Total Vendor Cost</span>
                  <span>{formatINR(totalVendorCost)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Pricing & Margin */}
        <TabsContent value="pricing" className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Cost Summary</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Total Vendor Cost (all lines × pax)</span>
                <span className="font-medium">{formatINR(totalVendorCost)}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-muted-foreground">Per Person Cost</span>
                <span>{formatINR(vendorCostPerPax)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Margin</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Margin %</Label>
                <Input type="number" value={form.margin_percent || ""} onChange={e => setField("margin_percent", parseFloat(e.target.value) || 0)}
                  className="mt-1 rounded-md text-lg font-semibold h-12" placeholder="Enter margin %" />
                <p className="text-[10px] text-muted-foreground mt-1">Applied on gross (total vendor cost)</p>
              </div>
              <div className="flex justify-between text-sm pt-2">
                <span className="text-muted-foreground">Margin Amount</span>
                <span className="font-semibold text-[hsl(var(--ridge))]">{formatINR(marginAmount)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Selling Price</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">Selling Price (ex-GST)</span>
                <span className="font-medium">{formatINR(sellingExGst)}</span>
              </div>
              <div className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">GST ({gstRate}%)</span>
                <span>{form.gst_billing ? formatINR(gstAmount) : <span className="text-muted-foreground">₹0 — Non-GST</span>}</span>
              </div>
              <div className="border-t border-border/40 pt-2 flex justify-between text-lg">
                <span className="font-medium">Final Customer Price</span>
                <span className="font-bold text-[hsl(var(--ridge))]">{formatINR(finalPrice)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-right">Per person: {formatINR(form.pax_count > 0 ? finalPrice / form.pax_count : 0)}</p>
            </CardContent>
          </Card>

          <Card className="border-[hsl(var(--ridge))]/20 shadow-none bg-[hsl(var(--ridge))]/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">💰 Trip P&L Summary</p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm"><span>Revenue (ex-GST)</span><span className="font-medium">{formatINR(sellingExGst)}</span></div>
                <div className="flex justify-between text-sm"><span>Vendor Cost</span><span>{formatINR(totalVendorCost)}</span></div>
                <div className="border-t border-[hsl(var(--ridge))]/20 my-2" />
                <div className="flex justify-between text-sm font-semibold"><span>Gross Profit</span><span className="text-[hsl(var(--ridge))]">{formatINR(marginAmount)}</span></div>
                <div className="flex justify-between text-sm"><span>Margin %</span><span>{form.margin_percent.toFixed(1)}%</span></div>
                <div className="border-t border-[hsl(var(--ridge))]/20 my-2" />
                <div className="flex justify-between text-sm"><span>GST Collected</span><span>{formatINR(gstAmount)}</span></div>
                <div className="flex justify-between text-sm font-semibold"><span>Final Invoice</span><span>{formatINR(finalPrice)}</span></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Documents & Notes */}
        <TabsContent value="docs" className="space-y-5">
          {/* PAN Card Upload */}
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Customer PAN Card</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">PDF, JPG, or PNG — max 5MB</p>
                {form.pan_card_url ? (
                  <div className="flex items-center gap-2 text-xs bg-muted/20 rounded-md p-2.5 border border-border/30">
                    <span className="truncate flex-1 font-mono">{form.pan_card_url.split("/").pop()}</span>
                    <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/cashflow-docs/${form.pan_card_url}`} target="_blank" rel="noreferrer"
                      className="text-primary hover:underline text-xs shrink-0">View</a>
                    <button onClick={() => setField("pan_card_url", "")} className="text-destructive hover:underline text-xs shrink-0">Remove</button>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="pan-upload"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
                        const code = existing?.cashflow_code || "new";
                        const path = `${code}/pan/${Date.now()}_${file.name}`;
                        const { error } = await supabase.storage.from("cashflow-docs").upload(path, file);
                        if (error) { toast.error("Upload failed"); return; }
                        setField("pan_card_url", path);
                        toast.success("PAN card uploaded");
                      }} />
                    <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => document.getElementById("pan-upload")?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1" />Upload PAN Card
                    </Button>
                  </div>
                )}
              </div>

              {/* Additional Documents */}
              <div>
                <Label className="text-xs text-muted-foreground">Other Documents</Label>
                <p className="text-[10px] text-muted-foreground mb-1.5">Passport copies, visa docs, etc.</p>
                {additionalDocs.map((doc, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-muted/20 rounded-md p-2.5 border border-border/30 mb-2">
                    <span className="truncate flex-1 font-mono">{doc.split("/").pop()}</span>
                    <a href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/cashflow-docs/${doc}`} target="_blank" rel="noreferrer"
                      className="text-primary hover:underline text-xs shrink-0">View</a>
                    <button onClick={() => setAdditionalDocs(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:underline text-xs shrink-0">Remove</button>
                  </div>
                ))}
                <div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="addl-doc-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return; }
                      const code = existing?.cashflow_code || "new";
                      const path = `${code}/docs/${Date.now()}_${file.name}`;
                      const { error } = await supabase.storage.from("cashflow-docs").upload(path, file);
                      if (error) { toast.error("Upload failed"); return; }
                      setAdditionalDocs(prev => [...prev, path]);
                      toast.success("Document uploaded");
                    }} />
                  <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => document.getElementById("addl-doc-upload")?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1" />Upload Document
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Internal Notes</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={5}
                className="rounded-md" placeholder="Trip notes, special requirements, vendor instructions..." />
              <p className="text-[10px] text-muted-foreground text-right mt-1">{(form.notes || "").length} characters</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Zoho Invoice Reference</CardTitle></CardHeader>
            <CardContent className="px-5 pb-4">
              <Input value={form.zoho_invoice_ref} onChange={e => setField("zoho_invoice_ref", e.target.value)}
                className="rounded-md" placeholder="Zoho invoice number for this trip" />
              <p className="text-[10px] text-muted-foreground mt-1">Enter after generating invoice in Zoho</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Complete Dialog */}
      <Dialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark this trip as completed?</DialogTitle>
            <DialogDescription>This finalises the P&L. The trip will be counted in revenue reports.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmComplete(false)}>Cancel</Button>
            <Button onClick={confirmCompleteAction}>Mark Completed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TripCashflowEdit;
