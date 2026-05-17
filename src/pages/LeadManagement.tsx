import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Download, RotateCcw, ChevronDown, Compass, X, Flame } from "lucide-react";
import { formatLabel } from "@/lib/formatLabel";
import { toast } from "sonner";
import { format, formatDistanceToNow, subDays, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import DateRangePicker from "@/components/DateRangePicker";

/* DB now stores the display value directly (e.g. "Not Contacted").
 * No translation between display labels and DB keys is needed anymore. */

/* ────── Platform → Channel mapping ────── */
const CHANNEL_BY_PLATFORM: Record<string, string[]> = {
  "Paid":     ["Google Search", "Google Display", "YouTube Ads", "Instagram Ads", "Facebook Ads", "WhatsApp Ads"],
  "Referral": ["Client Referral", "Non-Client Referral", "Partner Referral"],
  "Organic":  ["Website", "Walk-in", "Google My Business", "Direct Call", "WhatsApp Direct"],
  "Content":  ["Instagram Organic", "Facebook Organic", "YouTube Organic", "LinkedIn Organic", "Travel Blog"],
};
const filterChannelsByPlatform = <T extends { value: string }>(channels: T[], platform: string): T[] => {
  if (!platform) return channels;
  const allowed = CHANNEL_BY_PLATFORM[platform];
  if (!allowed) return channels;
  return channels.filter(c => allowed.includes(c.value));
};

/* ────── Disposition badge colors (light opaque chips) ────── */
const DISP_BADGE: Record<string, string> = {
  "Not Contacted": "bg-gray-100 text-gray-700 border-gray-200",
  "Wrong Number / Invalid Lead": "bg-red-50 text-red-700 border-red-200",
  "Busy Call Back": "bg-amber-50 text-amber-800 border-amber-200",
  "Not Reachable Call Back": "bg-orange-50 text-orange-700 border-orange-200",
  "Query Closed": "bg-blue-50 text-blue-700 border-blue-200",
  "Follow Up Needed": "bg-purple-50 text-purple-700 border-purple-200",
  "Destination Changed": "bg-teal-50 text-teal-700 border-teal-200",
  "Plan Dropped": "bg-pink-50 text-pink-700 border-pink-200",
  "Booked Outside": "bg-gray-100 text-gray-800 border-gray-300",
  "Ongoing Discussions": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Not Interested": "bg-slate-100 text-slate-700 border-slate-200",
  "Ghosted": "bg-gray-50 text-gray-600 border-gray-200",
  "Refund Issued": "bg-orange-100 text-orange-800 border-orange-300",
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

/* ────── Sales Status dot / badge colors ────── */
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

/* Active-tab style: full-bleed coloured pill (white text, bold) */
const STATUS_ACTIVE: Record<string, string> = {
  "File Closed": "bg-[hsl(var(--ridge))] text-white border-[hsl(var(--ridge))]",
  "File Lost": "bg-red-500 text-white border-red-500",
  "Quote Sent": "bg-[hsl(var(--horizon))] text-[hsl(var(--abyss))] border-[hsl(var(--horizon))]",
  "New Lead": "bg-[hsl(var(--abyss))] text-white border-[hsl(var(--abyss))]",
  "Contacted": "bg-[hsl(var(--lagoon))] text-white border-[hsl(var(--lagoon))]",
  "Follow Up Needed": "bg-[hsl(var(--blaze))] text-white border-[hsl(var(--blaze))]",
  "Ongoing Discussions": "bg-blue-500 text-white border-blue-500",
  "Refund Issued": "bg-orange-500 text-white border-orange-500",
  "Invalid Lead": "bg-gray-400 text-white border-gray-400",
  "Booked Outside": "bg-gray-700 text-white border-gray-700",
};

const STATUS_BADGE: Record<string, string> = {
  "File Closed": "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))] border-[hsl(var(--ridge))]/20",
  "File Lost": "bg-red-50 text-red-600 border-red-200",
  "Quote Sent": "bg-[hsl(var(--horizon))]/10 text-[hsl(var(--horizon))] border-[hsl(var(--horizon))]/20",
  "New Lead": "bg-[hsl(var(--abyss))]/10 text-[hsl(var(--abyss))] border-[hsl(var(--abyss))]/20",
  "Contacted": "bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-[hsl(var(--lagoon))]/20",
  "Follow Up Needed": "bg-[hsl(var(--blaze))]/10 text-[hsl(var(--blaze))] border-[hsl(var(--blaze))]/20",
  "Ongoing Discussions": "bg-blue-50 text-blue-600 border-blue-200",
  "Refund Issued": "bg-orange-50 text-orange-600 border-orange-200",
  "Invalid Lead": "bg-gray-100 text-gray-500 border-gray-200",
  "Booked Outside": "bg-gray-100 text-gray-700 border-gray-300",
};

const LeadManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  /* ── Filters ── */
  // Default = "Last 6 Months to date": start of the month 5 months ago → today.
  const defaultFrom = useMemo(() => startOfMonth(subMonths(new Date(), 5)), []);
  const defaultTo = useMemo(() => new Date(), []);
  const [dateFrom, setDateFrom] = useState<Date>(defaultFrom);
  const [dateTo, setDateTo] = useState<Date>(defaultTo);
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterAdGroup, setFilterAdGroup] = useState("all");
  const [filterDestination, setFilterDestination] = useState("all");
  const [moreFilters, setMoreFilters] = useState(false);

  /* ── Quick filters (multi-select) ── */
  const [activeDispositions, setActiveDispositions] = useState<Set<string>>(new Set());
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set());

  /* ── Table ── */
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);

  /* ── Form ── */
  const [form, setForm] = useState({
    name: "", email: "", mobile: "", travel_date: "",
    destination_id: "", itinerary_id: "", assigned_to: "",
    channel: "", platform: "", campaign_type: "", ad_group: "", notes: "",
  });

  /* ── Data queries ── */
  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("master_values").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: itineraries = [] } = useQuery({
    queryKey: ["itineraries_by_dest", form.destination_id],
    queryFn: async () => {
      let q = supabase.from("itineraries").select("id, headline, destination_id");
      if (form.destination_id) q = q.eq("destination_id", form.destination_id);
      const { data, error } = await q;
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

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, destinations(name), itineraries(headline, destinations(name)), users!leads_assigned_to_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  /* ── Loyalty trip counts by traveller_code (bulk) ── */
  const { data: loyaltyMap = {} } = useQuery<Record<string, number>>({
    queryKey: ["loyalty_trip_counts"],
    queryFn: async () => {
      const { data: tcRows } = await supabase
        .from("trip_cashflow")
        .select("traveller_code, status");
      const map: Record<string, number> = {};
      (tcRows || []).forEach((r: any) => {
        if (!r.traveller_code || r.status === "cancelled") return;
        map[r.traveller_code] = (map[r.traveller_code] || 0) + 1;
      });
      return map;
    },
  });

  const mvByType = useCallback((type: string) => masterValues.filter((v: any) => v.type === type), [masterValues]);

  /* ── Create lead ── */
  const createLead = useMutation({
    mutationFn: async (f: typeof form) => {
      const { data, error } = await supabase.from("leads").insert({
        // Leave blank → DB trigger generates a real traveller_code (e.g. M2600007).
        traveller_code: "",
        name: f.name,
        email: f.email || null,
        mobile: f.mobile || null,
        travel_date: f.travel_date || null,
        destination_id: f.destination_id || null,
        itinerary_id: f.itinerary_id || null,
        assigned_to: f.assigned_to || null,
        channel: f.channel || null,
        platform: f.platform || null,
        campaign_type: f.campaign_type || null,
        ad_group: f.ad_group || null,
        notes: f.notes || null,
        sales_status: "New Lead",
        disposition: "Not Contacted",
      }).select("id, traveller_code").single();
      if (error) throw error;

      // Log timeline
      await supabase.from("lead_timeline").insert({
        lead_id: data.id,
        actor_id: profile?.id || null,
        event_type: "lead_created",
        note: `Lead ${data.traveller_code} created`,
      });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setSheetOpen(false);
      setForm({ name: "", email: "", mobile: "", travel_date: "", destination_id: "", itinerary_id: "", assigned_to: "", channel: "", platform: "", campaign_type: "", ad_group: "", notes: "" });
      toast.success(`Lead ${data.traveller_code} created successfully`);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create lead"),
  });

  /* ── Filter logic ── */
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filterChannel !== "all") c++;
    if (filterPlatform !== "all") c++;
    if (filterCampaign !== "all") c++;
    if (filterAdGroup !== "all") c++;
    if (filterDestination !== "all") c++;
    return c;
  }, [filterChannel, filterPlatform, filterCampaign, filterAdGroup, filterDestination]);

  const filtered = useMemo(() => {
    const fromMs = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0).getTime();
    const toMs = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999).getTime();
    return leads.filter((l: any) => {
      const q = search.toLowerCase();
      if (q && !(l.name?.toLowerCase().includes(q) || l.traveller_code?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q) || l.mobile?.includes(q))) return false;
      if (l.created_at) {
        const t = new Date(l.created_at).getTime();
        if (t < fromMs || t > toMs) return false;
      }
      if (filterChannel !== "all" && l.channel !== filterChannel) return false;
      if (filterPlatform !== "all" && l.platform !== filterPlatform) return false;
      if (filterCampaign !== "all" && l.campaign_type !== filterCampaign) return false;
      if (filterAdGroup !== "all" && l.ad_group !== filterAdGroup) return false;
      if (filterDestination !== "all" && l.destination_id !== filterDestination) return false;
      if (activeDispositions.size > 0 && !activeDispositions.has(l.disposition)) return false;
      if (activeStatuses.size > 0 && !activeStatuses.has(l.sales_status)) return false;
      return true;
    });
  }, [leads, search, dateFrom, dateTo, filterChannel, filterPlatform, filterCampaign, filterAdGroup, filterDestination, activeDispositions, activeStatuses]);

  /* Counts are keyed by DB snake_case key (matches l.disposition / l.sales_status) */
  const dispositionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l: any) => { if (l.disposition) c[l.disposition] = (c[l.disposition] || 0) + 1; });
    return c;
  }, [leads]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    leads.forEach((l: any) => { if (l.sales_status) c[l.sales_status] = (c[l.sales_status] || 0) + 1; });
    return c;
  }, [leads]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 whenever the active filter set changes
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFrom, dateTo, filterChannel, filterPlatform, filterCampaign, filterAdGroup, filterDestination, activeDispositions, activeStatuses, search]);

  const resetFilters = () => {
    setDateFrom(startOfMonth(subMonths(new Date(), 5)));
    setDateTo(new Date());
    setFilterChannel("all"); setFilterPlatform("all"); setFilterCampaign("all");
    setFilterAdGroup("all"); setFilterDestination("all");
    setActiveDispositions(new Set()); setActiveStatuses(new Set()); setCurrentPage(1);
  };

  const toggleChip = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setFn(next);
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const headers = ["Traveller Code", "Name", "Email", "Mobile", "Destination", "Itinerary", "Disposition", "Sales Status", "Date"];
    const rows = filtered.map((l: any) => [
      l.traveller_code, l.name, l.email || "", l.mobile || "",
      l.destinations?.name || "", (l as any).itineraries?.headline || "",
      l.disposition || "", l.sales_status || "",
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    toast.success("Exported to CSV");
  };

  const anyFiltersActive =
    format(dateFrom, "yyyy-MM-dd") !== format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd") ||
    format(dateTo, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") ||
    filterChannel !== "all" || filterPlatform !== "all" || filterCampaign !== "all" ||
    filterAdGroup !== "all" || filterDestination !== "all" ||
    activeDispositions.size > 0 || activeStatuses.size > 0;

  const SmallSelect = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 text-xs rounded-md border-border/60 min-w-[120px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <AppLayout title="Lead Management">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lead Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} leads</p>
        </div>
        <Button onClick={() => setSheetOpen(true)} className="rounded-md">
          <Plus className="h-4 w-4 mr-1.5" />Add Lead
        </Button>
      </div>

      {/* ── Smart Filter Bar — single compact row ── */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 border border-border/50 rounded-lg bg-background h-12">
        <DateRangePicker
          from={dateFrom}
          to={dateTo}
          onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
        />
        <SmallSelect label="Destination" value={filterDestination} onChange={setFilterDestination}
          options={destinations.map((d: any) => ({ value: d.id, label: d.name }))} />
        <SmallSelect label="Platform" value={filterPlatform}
          onChange={(v) => { setFilterPlatform(v); if (v !== "all") setFilterChannel("all"); }}
          options={mvByType("platform").map((v: any) => ({ value: v.value, label: v.value }))} />
        <SmallSelect label="Channel" value={filterChannel} onChange={setFilterChannel}
          options={filterChannelsByPlatform(mvByType("channel"), filterPlatform === "all" ? "" : filterPlatform)
            .map((v: any) => ({ value: v.value, label: v.value }))} />
        <SmallSelect label="Campaign" value={filterCampaign} onChange={setFilterCampaign}
          options={mvByType("campaign_type").map((v: any) => ({ value: v.value, label: v.value }))} />

        {moreFilters && (
          <SmallSelect label="Ad Group" value={filterAdGroup} onChange={setFilterAdGroup}
            options={mvByType("ad_group").map((v: any) => ({ value: v.value, label: v.value }))} />
        )}
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2" onClick={() => setMoreFilters(!moreFilters)}>
          {moreFilters ? "Less" : "More"} <ChevronDown className={`h-3 w-3 transition-transform ${moreFilters ? "rotate-180" : ""}`} />
        </Button>

        {anyFiltersActive && (
          <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 whitespace-nowrap">
            <RotateCcw className="h-3 w-3" />Reset
          </button>
        )}

        <div className="ml-auto flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-md gap-1.5" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />Export
          </Button>
        </div>
      </div>

      {/* ── Disposition Chips ── */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Disposition</p>
        <div className="flex flex-wrap gap-1.5">
          {mvByType("disposition").map((d: any) => {
            const dbKey = displayToKey(d.value);
            const active = activeDispositions.has(dbKey);
            const dotColor = DISP_DOT[d.value] || "bg-gray-400";
            return (
              <button
                key={d.id}
                onClick={() => toggleChip(activeDispositions, setActiveDispositions, dbKey)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                  active ? "bg-foreground/5 border-foreground/20 shadow-sm" : "border-border/40 hover:border-border hover:bg-muted/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                <span className="text-foreground/80">{d.value}</span>
                <span className="text-muted-foreground text-[10px] font-semibold">·</span>
                <span className="text-muted-foreground text-[10px] font-semibold">{dispositionCounts[dbKey] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sales Status Chips ── */}
      <div className="mb-5">
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Sales Status</p>
        <div className="flex flex-wrap gap-1.5">
          {mvByType("sales_status").map((s: any) => {
            const dbKey = displayToKey(s.value);
            const active = activeStatuses.has(dbKey);
            const activeStyle = STATUS_ACTIVE[s.value] || "bg-foreground text-background border-foreground";
            const dotColor = STATUS_DOT[s.value] || "bg-gray-400";
            return (
              <button
                key={s.id}
                onClick={() => toggleChip(activeStatuses, setActiveStatuses, dbKey)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border transition-all duration-150 ${
                  active
                    ? `${activeStyle} font-bold shadow-sm`
                    : "font-medium border-border/40 hover:border-border hover:bg-muted/30"
                }`}
              >
                {!active && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
                <span>{s.value}</span>
                <span className={`text-[10px] font-semibold ${active ? "opacity-90" : "text-muted-foreground"}`}>·</span>
                <span className={`text-[10px] font-semibold ${active ? "opacity-90" : "text-muted-foreground"}`}>{statusCounts[dbKey] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table toolbar ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-[72px] h-8 text-xs rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">entries</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-8 w-64 text-xs rounded-md border-border/60" />
        </div>
      </div>

      {/* ── Data Table ── */}
      {paginated.length === 0 && !isLoading ? (
        /* Empty State */
        <Card className="border-border/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your first lead to get started</p>
            <Button onClick={() => setSheetOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Lead</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Name</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Destination</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Itinerary</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Source</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Disposition</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : (
                paginated.map((lead: any) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover:bg-[#F9FAFB] transition-colors duration-150 border-b border-border/30"
                    onClick={() => navigate(`/admin/leads/${lead.id}`)}
                  >
                    {/* Name + Mobile + Code */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const newVal = !(lead as any).is_hot;
                            supabase.from("leads").update({ is_hot: newVal } as any).eq("id", lead.id).then(({ error }) => {
                              if (error) { toast.error("Failed to update"); return; }
                              queryClient.invalidateQueries({ queryKey: ["leads"] });
                              toast.success(newVal ? "Marked as hot lead 🔥" : "Removed hot lead tag");
                            });
                          }}
                          className="flex-shrink-0 hover:scale-110 transition-transform"
                          title={`${(lead as any).is_hot ? "Remove" : "Mark as"} hot lead`}
                        >
                          <Flame className={`h-4 w-4 ${(lead as any).is_hot ? "text-orange-500 fill-orange-500" : "text-gray-300 hover:text-orange-300"}`} />
                        </button>
                        <div>
                          <div className="font-medium text-[13px] text-foreground flex items-center gap-1.5">
                            {lead.name}
                            {(() => {
                              const count = loyaltyMap[(lead as any).traveller_code] || 0;
                              if (count < 2) return null;
                              const color = count >= 5 ? "hsl(var(--blaze))" : count >= 3 ? "#16a34a" : "#2563eb";
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                  </TooltipTrigger>
                                  <TooltipContent>{count} confirmed trips</TooltipContent>
                                </Tooltip>
                              );
                            })()}
                          </div>
                          <div className="text-[12px] text-muted-foreground mt-0.5">
                            {lead.mobile || lead.email || "—"}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground/60 mt-0.5" style={{ color: "hsl(var(--blaze))" }}>
                            {lead.traveller_code}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Destination */}
                    <TableCell className="py-3">
                      {lead.destinations?.name ? (
                        <Badge variant="secondary" className="text-[11px] font-medium bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0 rounded-md">
                          {lead.destinations.name}
                        </Badge>
                      ) : <span className="text-[13px] text-muted-foreground">—</span>}
                    </TableCell>

                    {/* Itinerary */}
                    <TableCell className="py-3 max-w-[180px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[13px] text-muted-foreground truncate block">
                            {(lead as any).itineraries?.headline
                              ? ((lead as any).itineraries.headline.length > 30
                                ? (lead as any).itineraries.headline.slice(0, 30) + "..."
                                : (lead as any).itineraries.headline)
                              : "—"}
                          </span>
                        </TooltipTrigger>
                        {(lead as any).itineraries?.headline && (
                          <TooltipContent>{(lead as any).itineraries.headline}</TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>

                    {/* Source */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        {lead.platform && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border/50 rounded">
                            {lead.platform}
                          </Badge>
                        )}
                        <span className="text-[12px] text-muted-foreground">{lead.channel || ""}</span>
                      </div>
                    </TableCell>

                    {/* Disposition */}
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${DISP_DOT[lead.disposition] || DISP_DOT[formatLabel(lead.disposition)] || "bg-gray-300"}`} />
                        <span className="text-[12px] text-foreground/70">{lead.disposition ? formatLabel(lead.disposition) : "—"}</span>
                      </div>
                    </TableCell>

                    {/* Sales Status */}
                    <TableCell className="py-3">
                      <Badge variant="outline" className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${STATUS_BADGE[lead.sales_status] || STATUS_BADGE[formatLabel(lead.sales_status)] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
                        {lead.sales_status ? formatLabel(lead.sales_status) : "—"}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="py-3 text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[12px] text-muted-foreground">
                            {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : "—"}
                          </span>
                        </TooltipTrigger>
                        {lead.created_at && (
                          <TooltipContent>{format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a")}</TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 text-xs rounded-md">Prev</Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let page: number;
              if (totalPages <= 7) page = i + 1;
              else if (currentPage <= 4) page = i + 1;
              else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
              else page = currentPage - 3 + i;
              if (page < 1 || page > totalPages) return null;
              return (
                <Button key={page} size="sm" variant={page === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(page)} className="h-7 w-7 text-xs p-0 rounded-md">
                  {page}
                </Button>
              );
            })}
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 text-xs rounded-md">Next</Button>
          </div>
        </div>
      )}

      {/* ── Add Lead Slide-over ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <SheetTitle className="text-lg font-semibold">New Lead</SheetTitle>
          </SheetHeader>

          <form onSubmit={e => { e.preventDefault(); createLead.mutate(form); }} className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Section 1 */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Traveller Info</h3>
                <div className="space-y-3">
                  <div><Label className="text-xs mb-1 block">Full Name <span className="text-destructive">*</span></Label>
                    <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="rounded-md" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs mb-1 block">Email</Label>
                      <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="rounded-md" /></div>
                    <div><Label className="text-xs mb-1 block">Mobile</Label>
                      <Input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} className="rounded-md" /></div>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Trip Interest</h3>
                <div className="space-y-3">
                  <div><Label className="text-xs mb-1 block">Destination</Label>
                    <Select value={form.destination_id} onValueChange={v => setForm({...form, destination_id: v, itinerary_id: ""})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select destination" /></SelectTrigger>
                      <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1 block">Itinerary</Label>
                     <Select value={form.itinerary_id} onValueChange={v => {
                       const it: any = itineraries.find((x: any) => x.id === v);
                       setForm(prev => ({
                         ...prev,
                         itinerary_id: v,
                         destination_id: prev.destination_id || it?.destination_id || "",
                       }));
                     }}>
                       <SelectTrigger className="rounded-md"><SelectValue placeholder="Select itinerary" /></SelectTrigger>
                      <SelectContent>{itineraries.map((it: any) => <SelectItem key={it.id} value={it.id}>{it.headline}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1 block">Assigned To</Label>
                    <Select value={form.assigned_to} onValueChange={v => setForm({...form, assigned_to: v})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select team member" /></SelectTrigger>
                      <SelectContent>{users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Lead Source</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">Channel</Label>
                    <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{filterChannelsByPlatform(mvByType("channel"), form.platform).map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1 block">Platform</Label>
                    <Select value={form.platform} onValueChange={v => setForm({...form, platform: v, channel: ""})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mvByType("platform").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1 block">Campaign Type</Label>
                    <Select value={form.campaign_type} onValueChange={v => setForm({...form, campaign_type: v})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mvByType("campaign_type").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label className="text-xs mb-1 block">Ad Group</Label>
                    <Select value={form.ad_group} onValueChange={v => setForm({...form, ad_group: v})}>
                      <SelectTrigger className="rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mvByType("ad_group").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">Source data helps track ROI across campaigns</p>
              </div>

              {/* Section 4 */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Notes</h3>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                  placeholder="Any initial notes..." className="rounded-md" />
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-background border-t border-border/50 px-6 py-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} className="rounded-md">Cancel</Button>
              <Button type="submit" disabled={createLead.isPending} className="rounded-md">
                {createLead.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
};

export default LeadManagement;
