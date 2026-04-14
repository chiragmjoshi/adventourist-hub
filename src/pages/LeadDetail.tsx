import { useState, useEffect, useRef } from "react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, MoreHorizontal, RefreshCw, Flame, Phone, Mail, MessageCircle, Clock, FileText, MessageSquare, User, Info, ChevronRight, Send } from "lucide-react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

/* ── Timeline event colors ── */
const EVENT_COLORS: Record<string, string> = {
  lead_created: "bg-[#64CBB9]",
  status_change: "bg-[#FDC436]",
  disposition_change: "bg-[#8B5CF6]",
  note_added: "bg-[#6B7280]",
  document_uploaded: "bg-blue-500",
  file_closed: "bg-[#056147]",
};

const STATUS_DOT: Record<string, string> = {
  "File Closed": "bg-[hsl(var(--ridge))]",
  "File Lost": "bg-red-500",
  "Quote Sent": "bg-[hsl(var(--horizon))]",
  "New Lead": "bg-[hsl(var(--abyss))]",
  "Contacted": "bg-[hsl(var(--lagoon))]",
  "Follow Up Needed": "bg-[hsl(var(--blaze))]",
  "Ongoing Discussions": "bg-blue-500",
  "Refund Issued": "bg-orange-500",
  "Invalid Lead": "bg-gray-400",
  "Booked Outside": "bg-gray-700",
};

const DISP_DOT: Record<string, string> = {
  "Not Contacted": "bg-gray-400",
  "Wrong Number / Invalid Lead": "bg-red-500",
  "Busy Call Back": "bg-amber-400",
  "Not Reachable Call Back": "bg-orange-400",
  "Query Closed": "bg-blue-500",
  "Follow Up Needed": "bg-purple-500",
  "Destination Changed": "bg-teal-500",
  "Plan Dropped": "bg-pink-500",
  "Booked Outside": "bg-gray-700",
  "Ongoing Discussions": "bg-green-500",
  "Not Interested": "bg-slate-400",
  "Ghosted": "bg-gray-300",
  "Refund Issued": "bg-orange-600",
};

const LeadDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [cashflowPrompt, setCashflowPrompt] = useState(false);
  const [formState, setFormState] = useState<Record<string, any>>({});
  const [commentText, setCommentText] = useState("");

  /* ── Queries ── */
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads")
        .select("*, destinations(name), itineraries(headline), users!leads_assigned_to_fkey(name)")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: timeline = [], refetch: refetchTimeline } = useQuery({
    queryKey: ["lead_timeline", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_timeline")
        .select("*, users:actor_id(name)")
        .eq("lead_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["lead_trips", id],
    queryFn: async () => {
      const l = lead as any;
      if (!l?.traveller_code) return [];
      const { data, error } = await supabase.from("trip_cashflow")
        .select("*, destinations(name)").eq("lead_id", id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!lead,
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
    queryKey: ["users_active"],
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

  const { data: allItineraries = [] } = useQuery({
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
  const getField = (key: string) => formState[key] ?? (lead as any)?.[key] ?? "";

  /* ── Mutations ── */
  const updateLead = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const oldLead = lead as any;
      const { error } = await supabase.from("leads").update(updates as any).eq("id", id!);
      if (error) throw error;

      const events: { event_type: string; note: string }[] = [];
      if (updates.sales_status && updates.sales_status !== oldLead.sales_status) {
        const et = updates.sales_status === "File Closed" ? "file_closed" : "status_change";
        events.push({ event_type: et, note: `Sales status changed from "${oldLead.sales_status || 'None'}" to "${updates.sales_status}" by ${profile?.name || "User"}` });
      }
      if (updates.disposition && updates.disposition !== oldLead.disposition) {
        events.push({ event_type: "disposition_change", note: `Disposition changed from "${oldLead.disposition || 'None'}" to "${updates.disposition}" by ${profile?.name || "User"}` });
      }
      if (updates.notes !== undefined && updates.notes !== oldLead.notes) {
        events.push({ event_type: "note_added", note: `Note added by ${profile?.name || "User"}` });
      }
      for (const ev of events) {
        await supabase.from("lead_timeline").insert({ lead_id: id!, actor_id: profile?.id || null, ...ev });
      }
      if (updates.sales_status === "File Closed" && oldLead.sales_status !== "File Closed") {
        setCashflowPrompt(true);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", id] });
      queryClient.invalidateQueries({ queryKey: ["lead_timeline", id] });
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const handleStatusChange = (key: string, value: string) => {
    setFormState(prev => ({ ...prev, [key]: value }));
    updateLead.mutate({ [key]: value });
  };

  const handleSaveNotes = () => {
    if (!formState.notes && !(lead as any)?.notes) return;
    updateLead.mutate({ notes: formState.notes ?? (lead as any)?.notes });
    setFormState(prev => {
      const { notes, ...rest } = prev;
      return rest;
    });
  };

  const handleSaveEnquiry = () => {
    const { disposition, sales_status, notes, ...rest } = formState;
    if (Object.keys(rest).length === 0) { toast.info("No changes to save"); return; }
    updateLead.mutate(rest);
    setFormState(prev => {
      const { disposition: d, sales_status: s, notes: n, ...keep } = prev;
      const result: Record<string, any> = {};
      if (d !== undefined) result.disposition = d;
      if (s !== undefined) result.sales_status = s;
      if (n !== undefined) result.notes = n;
      return result;
    });
  };

  /* ── Comments (using lead_comments table) ── */
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["lead_comments", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_comments" as any)
        .select("*, users:user_id(name)")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase.from("lead_comments" as any).insert({
        lead_id: id!, user_id: profile?.id, comment: text,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead_comments", id] });
      setCommentText("");
      toast.success("Comment posted");
    },
  });

  const handleCreateCashflow = async () => {
    const l = lead as any;
    await supabase.from("trip_cashflow").insert({
      lead_id: l.id, traveller_code: l.traveller_code, traveller_name: l.name,
      destination_id: l.destination_id || null, itinerary_id: l.itinerary_id || null,
      assigned_to: l.assigned_to || null,
    });
    setCashflowPrompt(false);
    toast.success("Trip Cashflow entry created");
    navigate("/trip-cashflow");
  };

  if (isLoading) return <AppLayout title="Lead Detail"><div className="flex items-center justify-center py-20 text-muted-foreground">Loading lead...</div></AppLayout>;
  if (!lead) return <AppLayout title="Lead Detail"><div className="flex items-center justify-center py-20 text-muted-foreground">Lead not found</div></AppLayout>;

  const l = lead as any;
  const initials = l.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  // comments now from lead_comments query above

  return (
    <AppLayout title="Lead Detail">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/leads")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Lead Management
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono font-semibold" style={{ color: "hsl(var(--blaze))" }}>{l.traveller_code}</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={getField("disposition") || l.disposition || ""} onValueChange={v => handleStatusChange("disposition", v)}>
            <SelectTrigger className="h-8 text-xs rounded-md w-48 border-border/60">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${DISP_DOT[getField("disposition") || l.disposition] || "bg-gray-300"}`} />
                <SelectValue placeholder="Disposition" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {mvByType("disposition").map((d: any) => (
                <SelectItem key={d.id} value={d.value}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${DISP_DOT[d.value] || "bg-gray-300"}`} />
                    {d.value}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={getField("sales_status") || l.sales_status || ""} onValueChange={v => handleStatusChange("sales_status", v)}>
            <SelectTrigger className="h-8 text-xs rounded-md w-40 border-border/60">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[getField("sales_status") || l.sales_status] || "bg-gray-300"}`} />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {mvByType("sales_status").map((s: any) => (
                <SelectItem key={s.id} value={s.value}>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s.value] || "bg-gray-300"}`} />
                    {s.value}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-[320px] flex-shrink-0 space-y-4 sticky top-6 self-start">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col items-center text-center mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white mb-3"
                  style={{ backgroundColor: "hsl(var(--blaze))" }}>{initials}</div>
                <h2 className="text-lg font-semibold flex items-center gap-1.5">
                  {l.name}
                  {l.customer_tag === "hot" && <Flame className="h-4 w-4 text-orange-500" />}
                </h2>
                <span className="font-mono text-xs text-muted-foreground mt-0.5" style={{ color: "hsl(var(--blaze))" }}>{l.traveller_code}</span>
              </div>

              <div className="space-y-2.5">
                {l.mobile && (
                  <a href={`tel:${l.mobile}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Phone className="h-3.5 w-3.5" />{l.mobile}
                  </a>
                )}
                {l.email && (
                  <a href={`mailto:${l.email}`} className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Mail className="h-3.5 w-3.5" />{l.email}
                  </a>
                )}
                {l.mobile && (
                  <a href={`https://wa.me/${l.mobile.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                    <MessageCircle className="h-3 w-3" />Chat on WhatsApp
                  </a>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Allocated to</span>
                  <Select value={getField("assigned_to") || "unassigned"} onValueChange={v => {
                    const val = v === "unassigned" ? null : v;
                    setFormState(prev => ({...prev, assigned_to: val}));
                    updateLead.mutate({ assigned_to: val });
                  }}>
                    <SelectTrigger className="h-7 text-xs w-32 border-border/50 rounded-md"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Customer Tag</span>
                  <Input className="h-7 text-xs w-32 rounded-md border-border/50" value={getField("customer_tag")}
                    onChange={e => setFormState(prev => ({...prev, customer_tag: e.target.value}))}
                    onBlur={() => { if (formState.customer_tag !== undefined) updateLead.mutate({ customer_tag: formState.customer_tag }); }}
                    placeholder="e.g. hot, vip" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none bg-[#F9FAFB]">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Lead Source <Info className="h-3 w-3" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-2">
              {[["Platform", l.platform], ["Channel", l.channel], ["Campaign Type", l.campaign_type],
                ["Ad Group", l.ad_group], ["Landing Page", l.landing_page_id ? "Linked" : null],
                ["Itinerary Page", l.itineraries?.headline]
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="text-xs font-medium text-foreground">{val || "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="pb-2 px-5 pt-4">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trip History</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {[["Total Enquiries", "1"], ["Total Trips", String(trips.length)],
                  ["Revenue", trips.length > 0 ? `₹${trips.reduce((s: number, t: any) => s + (t.total_selling_price || 0), 0).toLocaleString("en-IN")}` : "₹0"],
                  ["CPL", "—"]
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-muted/30 rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-lg font-semibold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          <Tabs defaultValue="enquiry">
            <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none">
              {["enquiry", "trips", "comments"].map(tab => (
                <TabsTrigger key={tab} value={tab}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm capitalize">
                  {tab === "enquiry" ? "Current Enquiry" : tab === "trips" ? "Trips" : "Comments"}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="enquiry" className="mt-5 space-y-5">
              <Card className="border-border/50 shadow-none">
                <CardHeader className="px-5 pt-4 pb-3">
                  <CardTitle className="text-sm font-semibold">Enquiry Details</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Destination</Label>
                      <Select value={getField("destination_id") || ""} onValueChange={v => setFormState(prev => ({...prev, destination_id: v}))}>
                        <SelectTrigger className="h-9 text-xs mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Product (Itinerary)</Label>
                      <Select value={getField("itinerary_id") || ""} onValueChange={v => setFormState(prev => ({...prev, itinerary_id: v}))}>
                        <SelectTrigger className="h-9 text-xs mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{allItineraries.map((it: any) => <SelectItem key={it.id} value={it.id}>{it.headline}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Travel Date</Label>
                      <Input type="date" className="h-9 text-xs mt-1 rounded-md" value={getField("travel_date") || ""} onChange={e => setFormState(prev => ({...prev, travel_date: e.target.value}))} />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Created On</Label>
                      <p className="text-sm mt-1.5">{l.created_at ? format(new Date(l.created_at), "dd MMM yyyy, hh:mm a") : "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Proposed Price</Label>
                      <Input className="h-9 text-xs mt-1 rounded-md" placeholder="₹" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Vendor Cost Price</Label>
                      <Input className="h-9 text-xs mt-1 rounded-md" placeholder="₹" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Margin</Label>
                      <p className="text-sm mt-1.5 font-medium">—</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Vendor</Label>
                      <Select value="" onValueChange={() => {}}>
                        <SelectTrigger className="h-9 text-xs mt-1 rounded-md"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                        <SelectContent>{vendors.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end mt-5">
                    <Button size="sm" onClick={handleSaveEnquiry} className="rounded-md">Save Changes</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-none">
                <CardHeader className="px-5 pt-4 pb-2">
                  <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  <Textarea rows={4} className="rounded-md" placeholder="Add internal notes..."
                    value={formState.notes ?? l.notes ?? ""}
                    onChange={e => setFormState(prev => ({...prev, notes: e.target.value}))} />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {(formState.notes ?? l.notes ?? "").length} characters
                    </span>
                    <Button variant="outline" size="sm" onClick={handleSaveNotes} className="rounded-md text-xs">Save Notes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trips" className="mt-5">
              <Card className="border-border/50 shadow-none">
                {trips.length === 0 ? (
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground text-sm">No trips yet. Close a file to create the first trip.</p>
                  </CardContent>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[11px] uppercase tracking-wider">Trip Code</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">Destination</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">Travel Dates</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">Pax</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">Revenue</TableHead>
                        <TableHead className="text-[11px] uppercase tracking-wider">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trips.map((t: any) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs font-mono">{t.traveller_code}</TableCell>
                          <TableCell className="text-xs">{t.destinations?.name || "—"}</TableCell>
                          <TableCell className="text-xs">{t.travel_start_date || "—"}</TableCell>
                          <TableCell className="text-xs">{t.pax_count}</TableCell>
                          <TableCell className="text-xs">₹{(t.total_selling_price || 0).toLocaleString("en-IN")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="comments" className="mt-5">
              <Card className="border-border/50 shadow-none">
                <CardContent className="p-5">
                  <div className="mb-5">
                    <Textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3}
                      className="rounded-md mb-2" placeholder="Add an internal comment..." />
                    <div className="flex justify-end">
                      <Button size="sm" className="rounded-md bg-[hsl(var(--blaze))] hover:bg-[hsl(var(--blaze))]/90" disabled={!commentText.trim() || addComment.isPending}
                        onClick={() => addComment.mutate(commentText.trim())}>
                        Post Comment
                      </Button>
                    </div>
                  </div>
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Add the first comment.</p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((c: any) => {
                        const userName = c.users?.name || "Unknown";
                        const userInitial = userName[0]?.toUpperCase() || "?";
                        return (
                          <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 text-white" style={{ backgroundColor: "hsl(var(--blaze))" }}>
                              {userInitial}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{userName}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  {c.created_at ? formatDistanceToNow(new Date(c.created_at), { addSuffix: true }) : ""}
                                </span>
                              </div>
                              <p className="text-sm text-foreground/80 mt-0.5">{c.comment}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6">
            <Card className="border-border/50 shadow-none">
              <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activity Timeline</CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => refetchTimeline()}>
                  <RefreshCw className="h-3 w-3 mr-1" />Refresh
                </Button>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {timeline.filter((e: any) => e.event_type !== "comment").length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No timeline events yet</p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/60" />
                    <div className="space-y-4">
                      {timeline.filter((e: any) => e.event_type !== "comment").map((event: any) => (
                        <div key={event.id} className="flex gap-3 relative">
                          <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${EVENT_COLORS[event.event_type] || "bg-gray-400"}`}>
                            {event.event_type === "lead_created" ? <User className="h-3 w-3 text-white" /> :
                             event.event_type === "status_change" || event.event_type === "file_closed" ? <FileText className="h-3 w-3 text-white" /> :
                             event.event_type === "disposition_change" ? <MessageSquare className="h-3 w-3 text-white" /> :
                             <Clock className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm font-medium">{event.note}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[11px] text-muted-foreground">
                                    {event.created_at ? formatDistanceToNow(new Date(event.created_at), { addSuffix: true }) : ""}
                                  </span>
                                </TooltipTrigger>
                                {event.created_at && <TooltipContent>{format(new Date(event.created_at), "dd MMM yyyy, hh:mm a")}</TooltipContent>}
                              </Tooltip>
                              {(event as any).users?.name && (
                                <span className="text-[11px] text-muted-foreground">• {(event as any).users.name}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={cashflowPrompt} onOpenChange={setCashflowPrompt}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>Mark as File Closed?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will mark the trip as confirmed. Would you like to create a Trip Cashflow entry for this lead?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCashflowPrompt(false)} className="rounded-md">Just Close File</Button>
            <Button onClick={handleCreateCashflow} className="rounded-md">Close & Create Cashflow</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default LeadDetail;
