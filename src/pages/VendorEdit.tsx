import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ChevronRight, Plus, Trash2, Save, Upload } from "lucide-react";
import { toast } from "sonner";

interface ContactPoint {
  name: string;
  mobile: string;
  email: string;
  role: string;
  alt_mobile?: string;
  alt_email?: string;
  show_secondary?: boolean;
}

const emptyContact = (): ContactPoint => ({
  name: "", mobile: "", email: "", role: "", alt_mobile: "", alt_email: "", show_secondary: false,
});

const VendorEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "", nick_name: "", vendor_code: "",
    serve_destinations: [] as string[], services: [] as string[],
    office_address_1: "", office_address_2: "", notes: "",
    bank_name: "", bank_account: "", bank_ifsc: "", bank_swift: "", bank_micr: "",
    pan: "", gst: "",
    contact_points: [emptyContact()] as ContactPoint[],
  });

  const [panFile, setPanFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [panUrl, setPanUrl] = useState("");
  const [gstUrl, setGstUrl] = useState("");

  const { data: existing } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["mv_service_type"],
    queryFn: async () => {
      const { data } = await supabase.from("master_values").select("value").eq("type", "service_type").eq("is_active", true).order("sort_order");
      return data?.map((d: any) => d.value) || [];
    },
  });

  useEffect(() => {
    if (existing) {
      const cp = Array.isArray(existing.contact_points) ? (existing.contact_points as unknown as ContactPoint[]) : [emptyContact()];
      setForm({
        name: existing.name || "",
        nick_name: existing.nick_name || "",
        vendor_code: existing.vendor_code || "",
        serve_destinations: existing.serve_destinations || [],
        services: existing.services || [],
        office_address_1: existing.office_address_1 || "",
        office_address_2: existing.office_address_2 || "",
        notes: (existing as any).notes || "",
        bank_name: existing.bank_name || "",
        bank_account: existing.bank_account || "",
        bank_ifsc: existing.bank_ifsc || "",
        bank_swift: existing.bank_swift || "",
        bank_micr: existing.bank_micr || "",
        pan: existing.pan || "",
        gst: existing.gst || "",
        contact_points: cp.length > 0 ? cp : [emptyContact()],
      });
    }
  }, [existing]);

  const setField = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleArrayItem = (key: string, item: string) => {
    setForm(prev => {
      const arr = prev[key as keyof typeof prev] as string[];
      return { ...prev, [key]: arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item] };
    });
  };

  const updateContact = (idx: number, updates: Partial<ContactPoint>) => {
    const cp = [...form.contact_points];
    cp[idx] = { ...cp[idx], ...updates };
    setField("contact_points", cp);
  };

  const addContact = () => setField("contact_points", [...form.contact_points, emptyContact()]);
  const removeContact = (idx: number) => setField("contact_points", form.contact_points.filter((_, i) => i !== idx));

  const uploadFile = async (file: File, docType: string, vendorCode: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${vendorCode}_${docType}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("vendor-docs").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("vendor-docs").getPublicUrl(path);
    return data.publicUrl;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Company name is required";
    if (form.serve_destinations.length === 0) errs.serve_destinations = "Select at least one destination";
    if (form.services.length === 0) errs.services = "Select at least one service";
    if (!form.office_address_1.trim()) errs.office_address_1 = "Office address is required";
    if (form.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) errs.pan = "Invalid PAN format (ABCDE1234F)";
    if (form.gst && form.gst.length !== 15) errs.gst = "GST must be 15 characters";
    const cp0 = form.contact_points[0];
    if (!cp0?.name?.trim()) errs["cp_0_name"] = "Contact name is required";
    if (!cp0?.mobile?.trim()) errs["cp_0_mobile"] = "Contact mobile is required";
    if (!cp0?.email?.trim()) errs["cp_0_email"] = "Contact email is required";
    if (!cp0?.role?.trim()) errs["cp_0_role"] = "Contact role is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (errs.name || errs.serve_destinations || errs.services || errs.office_address_1) setActiveTab("basic");
      else if (errs.pan || errs.gst) setActiveTab("bank");
      else setActiveTab("contacts");
    }
    return Object.keys(errs).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const vendorCode = form.vendor_code || "TEMP";
      let panCardUrl = panUrl;
      let gstCertUrl = gstUrl;
      if (panFile) panCardUrl = await uploadFile(panFile, "pan", vendorCode);
      if (gstFile) gstCertUrl = await uploadFile(gstFile, "gst", vendorCode);

      const payload: any = {
        name: form.name.trim(),
        nick_name: form.nick_name.trim() || null,
        serve_destinations: form.serve_destinations,
        services: form.services,
        office_address_1: form.office_address_1.trim() || null,
        office_address_2: form.office_address_2.trim() || null,
        notes: form.notes.trim() || null,
        bank_name: form.bank_name.trim() || null,
        bank_account: form.bank_account.trim() || null,
        bank_ifsc: form.bank_ifsc.trim() || null,
        bank_swift: form.bank_swift.trim() || null,
        bank_micr: form.bank_micr.trim() || null,
        pan: form.pan.trim() || null,
        gst: form.gst.trim() || null,
        contact_points: form.contact_points,
      };

      if (isNew) {
        // vendor_code auto-generated by trigger; pass empty to trigger
        payload.vendor_code = "";
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").update(payload).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(`Vendor ${form.name} saved successfully`);
      navigate("/vendors");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save vendor"),
  });

  const handleSubmit = () => {
    if (!validate()) return;
    saveMutation.mutate();
  };

  const nextTab = () => {
    if (activeTab === "basic") setActiveTab("bank");
    else if (activeTab === "bank") setActiveTab("contacts");
  };

  const FieldError = ({ field }: { field: string }) => errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <AppLayout title={isNew ? "New Vendor" : "Edit Vendor"}>
      {/* Sticky top bar */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/vendors")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Vendors
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{form.name || "New Vendor"}</span>
          {form.vendor_code && <span className="font-mono text-xs text-primary ml-2">{form.vendor_code}</span>}
        </div>
        <div className="flex items-center gap-2">
          {activeTab !== "contacts" && (
            <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={nextTab}>
              Save & Continue
            </Button>
          )}
          <Button size="sm" className="rounded-md text-xs" onClick={handleSubmit} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Vendor
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none mb-5">
          {[
            { v: "basic", l: "Basic Details" },
            { v: "bank", l: "Bank & Compliance" },
            { v: "contacts", l: "Contact Points" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Basic Details */}
        <TabsContent value="basic" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Service Information</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Service Destinations <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {destinations.map((d: any) => (
                    <button key={d.id} onClick={() => toggleArrayItem("serve_destinations", d.id)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        form.serve_destinations.includes(d.id)
                          ? "bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-[hsl(var(--lagoon))]/30" : "border-border/50 hover:border-border"
                      }`}>{d.name}</button>
                  ))}
                </div>
                <FieldError field="serve_destinations" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Services <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {serviceTypes.map((s: string) => (
                    <button key={s} onClick={() => toggleArrayItem("services", s)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        form.services.includes(s)
                          ? "bg-[hsl(var(--horizon))]/10 text-[hsl(var(--horizon))] border-[hsl(var(--horizon))]/30" : "border-border/50 hover:border-border"
                      }`}>{s}</button>
                  ))}
                </div>
                <FieldError field="services" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Company Information</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Company Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setField("name", e.target.value)} className="mt-1 rounded-md" placeholder="Full legal company name" />
                <FieldError field="name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Vendor Nick Name</Label>
                  <Input value={form.nick_name} onChange={e => setField("nick_name", e.target.value)} className="mt-1 rounded-md" placeholder="Internal short name" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Vendor Code</Label>
                  <Input value={form.vendor_code || (isNew ? "Auto-generated" : "")} readOnly className="mt-1 rounded-md bg-muted/30 font-mono text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Office Addresses</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Office Address 1 <span className="text-destructive">*</span></Label>
                <Textarea value={form.office_address_1} onChange={e => setField("office_address_1", e.target.value)} rows={2} className="mt-1 rounded-md" />
                <FieldError field="office_address_1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Office Address 2 <span className="text-muted-foreground">(Optional)</span></Label>
                <Textarea value={form.office_address_2} onChange={e => setField("office_address_2", e.target.value)} rows={2} className="mt-1 rounded-md" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Additional Information</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={3} className="mt-1 rounded-md" placeholder="Internal notes about this vendor..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bank & Compliance */}
        <TabsContent value="bank" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Bank Details</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Bank Name</Label>
                  <Input value={form.bank_name} onChange={e => setField("bank_name", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bank A/C Number</Label>
                  <Input value={form.bank_account} onChange={e => setField("bank_account", e.target.value)} className="mt-1 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Bank IFSC</Label>
                  <Input value={form.bank_ifsc} onChange={e => setField("bank_ifsc", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Branch</Label>
                  <Input className="mt-1 rounded-md" placeholder="Branch name" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">SWIFT Code</Label>
                <Input value={form.bank_swift} onChange={e => setField("bank_swift", e.target.value)} className="mt-1 rounded-md" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">MICR</Label>
                <Input value={form.bank_micr} onChange={e => setField("bank_micr", e.target.value)} className="mt-1 rounded-md" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Compliance Information</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">PAN</Label>
                  <Input value={form.pan} onChange={e => setField("pan", e.target.value.toUpperCase())}
                    className="mt-1 rounded-md font-mono" maxLength={10} placeholder="ABCDE1234F" />
                  <p className="text-[10px] text-muted-foreground mt-0.5">10 characters uppercase</p>
                  <FieldError field="pan" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">GST Number</Label>
                  <Input value={form.gst} onChange={e => setField("gst", e.target.value.toUpperCase())}
                    className="mt-1 rounded-md font-mono" maxLength={15} placeholder="15-character alphanumeric" />
                  <FieldError field="gst" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Upload PAN Card</Label>
                  <div className="mt-1">
                    {panFile ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md">
                        <span className="text-xs truncate flex-1">{panFile.name}</span>
                        <button onClick={() => setPanFile(null)} className="text-xs text-destructive hover:underline">Remove</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border/60 rounded-md cursor-pointer hover:bg-muted/20 transition-colors">
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 5MB)</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f && f.size <= 5 * 1024 * 1024) setPanFile(f);
                          else if (f) toast.error("File too large. Max 5MB.");
                        }} />
                      </label>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Upload GST Certificate <span className="text-muted-foreground">(Optional)</span></Label>
                  <div className="mt-1">
                    {gstFile ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md">
                        <span className="text-xs truncate flex-1">{gstFile.name}</span>
                        <button onClick={() => setGstFile(null)} className="text-xs text-destructive hover:underline">Remove</button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-border/60 rounded-md cursor-pointer hover:bg-muted/20 transition-colors">
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">PDF, JPG, PNG (max 5MB)</span>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f && f.size <= 5 * 1024 * 1024) setGstFile(f);
                          else if (f) toast.error("File too large. Max 5MB.");
                        }} />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Contact Points */}
        <TabsContent value="contacts" className="space-y-4">
          {form.contact_points.map((cp, idx) => (
            <Card key={idx} className="border-border/50 shadow-none">
              <CardHeader className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Contact Point {idx + 1}</CardTitle>
                  {idx > 0 && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => removeContact(idx)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />Remove
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5 space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Contact Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name <span className="text-destructive">*</span></Label>
                    <Input value={cp.name} onChange={e => updateContact(idx, { name: e.target.value })} className="mt-1 rounded-md" />
                    {idx === 0 && <FieldError field="cp_0_name" />}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mobile Number <span className="text-destructive">*</span></Label>
                    <Input value={cp.mobile} onChange={e => updateContact(idx, { mobile: e.target.value })} className="mt-1 rounded-md" placeholder="+91-XXXXX-XXXXX" />
                    {idx === 0 && <FieldError field="cp_0_mobile" />}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">KRA / Role <span className="text-destructive">*</span></Label>
                    <Input value={cp.role} onChange={e => updateContact(idx, { role: e.target.value })} className="mt-1 rounded-md" placeholder="e.g. Accounts Manager" />
                    {idx === 0 && <FieldError field="cp_0_role" />}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email Address <span className="text-destructive">*</span></Label>
                    <Input type="email" value={cp.email} onChange={e => updateContact(idx, { email: e.target.value })} className="mt-1 rounded-md" />
                    {idx === 0 && <FieldError field="cp_0_email" />}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <Checkbox checked={cp.show_secondary || false} onCheckedChange={v => updateContact(idx, { show_secondary: !!v })} />
                  <Label className="text-xs text-muted-foreground cursor-pointer">Add secondary contact</Label>
                </div>

                {cp.show_secondary && (
                  <div className="grid grid-cols-2 gap-4 pl-6 border-l-2 border-border/30">
                    <div>
                      <Label className="text-xs text-muted-foreground">Alternative Mobile</Label>
                      <Input value={cp.alt_mobile || ""} onChange={e => updateContact(idx, { alt_mobile: e.target.value })} className="mt-1 rounded-md" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Alternative Email</Label>
                      <Input type="email" value={cp.alt_email || ""} onChange={e => updateContact(idx, { alt_email: e.target.value })} className="mt-1 rounded-md" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={addContact}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add New Contact
          </Button>

          <div className="flex justify-end pt-4">
            <Button className="rounded-md" onClick={handleSubmit} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />Submit
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default VendorEdit;
