import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MoreHorizontal, RefreshCw, Flame, Clock, User, FileText, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [cashflowPrompt, setCashflowPrompt] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, destinations(name), itineraries(headline), users!leads_assigned_to_fkey(name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ["lead_timeline", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_timeline")
        .select("*, users:actor_id(name)")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("master_values").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: itineraries = [] } = useQuery({
    queryKey: ["itineraries_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itineraries").select("id, headline");
      if (error) throw error;
      return data;
    },
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const mvByType = (type: string) => masterValues.filter((v: any) => v.type === type);

  // Form state for editable fields
  const [formState, setFormState] = useState<Record<string, any>>({});

  // Initialize form when lead loads
  const getField = (key: string) => formState[key] ?? (lead as any)?.[key] ?? "";

  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const oldLead = lead as any;

      const { error } = await supabase.from("leads").update(updates).eq("id", id!);
      if (error) throw error;

      // Log timeline events for status changes
      const events: { event_type: string; note: string }[] = [];
      if (updates.sales_status && updates.sales_status !== oldLead.sales_status) {
        events.push({
          event_type: "status_change",
          note: `Sales status changed to "${updates.sales_status}" by ${profile?.name || "User"}`,
        });
      }
      if (updates.disposition && updates.disposition !== oldLead.disposition) {
        events.push({
          event_type: "disposition_change",
          note: `Disposition changed to "${updates.disposition}" by ${profile?.name || "User"}`,
        });
      }
      if (updates.notes && updates.notes !== oldLead.notes) {
        events.push({ event_type: "note_added", note: "Notes updated" });
      }
      for (const ev of events) {
        await supabase.from("lead_timeline").insert({
          lead_id: id!,
          actor_id: profile?.id || null,
          event_type: ev.event_type,
          note: ev.note,
        });
      }

      // Check if File Closed
      if (updates.sales_status === "File Closed" && oldLead.sales_status !== "File Closed") {
        setCashflowPrompt(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["lead_timeline", id] });
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update lead"),
  });

  const handleSave = () => {
    if (Object.keys(formState).length === 0) { toast.info("No changes"); return; }
    updateLead.mutate(formState);
    setFormState({});
  };

  const handleCreateCashflow = async () => {
    const l = lead as any;
    await supabase.from("trip_cashflow").insert({
      lead_id: l.id,
      traveller_code: l.traveller_code,
      traveller_name: l.name,
      destination_id: l.destination_id || null,
      itinerary_id: l.itinerary_id || null,
      assigned_to: l.assigned_to || null,
    });
    setCashflowPrompt(false);
    toast.success("Trip Cashflow entry created");
    navigate("/trip-cashflow");
  };

  if (isLoading) return <AppLayout title="Lead Detail"><div className="p-8 text-center text-muted-foreground">Loading...</div></AppLayout>;
  if (!lead) return <AppLayout title="Lead Detail"><div className="p-8 text-center text-muted-foreground">Lead not found</div></AppLayout>;

  const l = lead as any;
  const initials = l.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <AppLayout title="Lead Detail">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/leads")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ backgroundColor: "hsl(var(--blaze))" }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{l.name}</h2>
              {l.customer_tag === "hot" && <Flame className="h-5 w-5 text-orange-500" />}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="font-mono font-semibold" style={{ color: "hsl(var(--blaze))" }}>{l.traveller_code}</span>
              {l.mobile && <span>📞 {l.mobile}</span>}
              {l.email && <span>✉️ {l.email}</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditMode(!editMode)}>{editMode ? "Cancel" : "Edit"}</Button>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="enquiry">
        <TabsList>
          <TabsTrigger value="enquiry">Current Enquiry</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="enquiry" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 space-y-4">
              {/* Basic Card */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" />Basic</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Original Lead Date</Label>
                    <p className="text-sm">{l.created_at ? format(new Date(l.created_at), "dd MMM yyyy, hh:mm a") : "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Allocated To</Label>
                    {editMode ? (
                      <Select value={getField("assigned_to") || "unassigned"} onValueChange={v => setFormState({...formState, assigned_to: v === "unassigned" ? null : v})}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div>{l.users?.name || <Badge variant="outline" className="text-[10px]">Unassigned</Badge>}</div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Customer Tag</Label>
                    {editMode ? (
                      <Input className="h-8 text-xs" value={getField("customer_tag")} onChange={e => setFormState({...formState, customer_tag: e.target.value})} />
                    ) : <p className="text-sm">{l.customer_tag || "—"}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Address</Label>
                    {editMode ? (
                      <Input className="h-8 text-xs" value={getField("address")} onChange={e => setFormState({...formState, address: e.target.value})} />
                    ) : <p className="text-sm">{l.address || "—"}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Trips Summary */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Trips Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-muted-foreground">Total Enquiries</p><p className="text-lg font-semibold">1</p></div>
                    <div><p className="text-xs text-muted-foreground">Total Trips</p><p className="text-lg font-semibold">0</p></div>
                    <div><p className="text-xs text-muted-foreground">Revenue</p><p className="text-lg font-semibold">₹0</p></div>
                    <div><p className="text-xs text-muted-foreground">CPL</p><p className="text-lg font-semibold">—</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Source Snapshot */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Source Snapshot</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    ["Campaign Type", l.campaign_type],
                    ["Platform", l.platform],
                    ["Ad Group", l.ad_group],
                    ["Channel", l.channel],
                    ["Landing Page", l.landing_page_id ? "Linked" : "—"],
                    ["Itinerary Page", l.itineraries?.headline || "—"],
                  ].map(([label, val]) => (
                    <div key={label as string} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{val || "—"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Legal & Documents */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Legal & Documents</CardTitle></CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                    Drop files here or click to upload
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-3 space-y-4">
              {/* Current Enquiry Card */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Current Enquiry</CardTitle>
                    <div className="flex gap-2">
                      <Select
                        value={getField("disposition") || l.disposition}
                        onValueChange={v => setFormState({...formState, disposition: v})}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-44"><SelectValue placeholder="Disposition" /></SelectTrigger>
                        <SelectContent>
                          {mvByType("disposition").map((d: any) => <SelectItem key={d.id} value={d.value}>{d.value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Select
                        value={getField("sales_status") || l.sales_status}
                        onValueChange={v => setFormState({...formState, sales_status: v})}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          {mvByType("sales_status").map((s: any) => <SelectItem key={s.id} value={s.value}>{s.value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Destination</Label>
                      {editMode ? (
                        <Select value={getField("destination_id") || l.destination_id || ""} onValueChange={v => setFormState({...formState, destination_id: v})}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <p className="text-sm font-medium">{l.destinations?.name || "—"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Est. Version</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Product (Itinerary)</Label>
                      {editMode ? (
                        <Select value={getField("itinerary_id") || l.itinerary_id || ""} onValueChange={v => setFormState({...formState, itinerary_id: v})}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{itineraries.map((it: any) => <SelectItem key={it.id} value={it.id}>{it.headline}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <p className="text-sm font-medium">{l.itineraries?.headline || "—"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Created On</Label>
                      <p className="text-sm">{l.created_at ? format(new Date(l.created_at), "dd MMM yyyy") : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Travel Date</Label>
                      {editMode ? (
                        <Input type="date" className="h-8 text-xs" value={getField("travel_date") || l.travel_date || ""} onChange={e => setFormState({...formState, travel_date: e.target.value})} />
                      ) : <p className="text-sm">{l.travel_date || "—"}</p>}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Sent On</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Proposal Status</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Comments</Label>
                      <Button variant="link" size="sm" className="h-6 text-xs p-0">View</Button>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Proposed Price</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div />
                    <div>
                      <Label className="text-xs text-muted-foreground">Vendor Cost Price</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div />
                    <div>
                      <Label className="text-xs text-muted-foreground">Margin</Label>
                      <p className="text-sm">—</p>
                    </div>
                    <div />
                    <div>
                      <Label className="text-xs text-muted-foreground">Vendor</Label>
                      {editMode ? (
                        <Select value="" onValueChange={() => {}}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : <p className="text-sm">—</p>}
                    </div>
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      className="mt-1"
                      rows={3}
                      value={getField("notes") || ""}
                      onChange={e => setFormState({...formState, notes: e.target.value})}
                      placeholder="Add notes..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={updateLead.isPending}>
                      {updateLead.isPending ? "Saving..." : "Save and Submit"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Timeline</CardTitle>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => refetchTimeline()}>
                      <RefreshCw className="h-3 w-3 mr-1" />Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No timeline events yet</p>
                  ) : (
                    <div className="space-y-3">
                      {timeline.map((event: any) => (
                        <div key={event.id} className="flex gap-3 text-sm">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            {event.event_type === "status_change" ? <FileText className="h-3.5 w-3.5" /> :
                             event.event_type === "disposition_change" ? <MessageSquare className="h-3.5 w-3.5" /> :
                             <Clock className="h-3.5 w-3.5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">{event.note}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.created_at ? format(new Date(event.created_at), "dd MMM yyyy, hh:mm a") : ""}
                              {event.users?.name ? ` • ${event.users.name}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trips" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Trip history will appear here once trips are booked.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>Comments module coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Closed → Create Cashflow Prompt */}
      <Dialog open={cashflowPrompt} onOpenChange={setCashflowPrompt}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Trip Cashflow?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            The sales status has been changed to <strong>File Closed</strong>. Would you like to create a Trip Cashflow entry for this lead?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCashflowPrompt(false)}>Skip</Button>
            <Button onClick={handleCreateCashflow}>Create Cashflow</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default LeadDetail;
