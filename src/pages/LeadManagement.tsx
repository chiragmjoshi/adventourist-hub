import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Download, RotateCcw, Filter } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

const DISPOSITION_COLORS: Record<string, string> = {
  "Not Contacted": "bg-gray-100 text-gray-700 border-gray-300",
  "Wrong Number / Invalid Lead": "bg-red-100 text-red-700 border-red-300",
  "Busy Call Back": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Not Reachable Call Back": "bg-orange-100 text-orange-700 border-orange-300",
  "Query Closed": "bg-blue-100 text-blue-700 border-blue-300",
  "Follow Up Needed": "bg-purple-100 text-purple-700 border-purple-300",
  "Destination Changed": "bg-teal-100 text-teal-700 border-teal-300",
  "Plan Dropped": "bg-pink-100 text-pink-700 border-pink-300",
  "Booked Outside": "bg-gray-200 text-gray-800 border-gray-400",
  "Ongoing Discussions": "bg-green-100 text-green-700 border-green-300",
  "Not Interested": "bg-red-50 text-red-500 border-red-200",
  "Ghosted": "bg-gray-50 text-gray-500 border-gray-200",
  "Refund Issued": "bg-orange-100 text-orange-600 border-orange-300",
};

const STATUS_COLORS: Record<string, string> = {
  "File Closed": "bg-green-100 text-green-700 border-green-300",
  "File Lost": "bg-red-100 text-red-700 border-red-300",
  "Quote Sent": "bg-blue-100 text-blue-700 border-blue-300",
  "New Lead": "bg-gray-100 text-gray-700 border-gray-300",
  "Contacted": "bg-yellow-100 text-yellow-700 border-yellow-300",
  "Refund Issued": "bg-orange-100 text-orange-600 border-orange-300",
  "Invalid Lead": "bg-red-50 text-red-500 border-red-200",
  "Follow Up Needed": "bg-purple-100 text-purple-700 border-purple-300",
  "Ongoing Discussions": "bg-green-50 text-green-600 border-green-200",
  "Booked Outside": "bg-gray-200 text-gray-800 border-gray-400",
};

const LeadManagement = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = new Date();

  // Master filters
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(now), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(now), "yyyy-MM-dd"));
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const [filterAdGroup, setFilterAdGroup] = useState("all");
  const [filterDestination, setFilterDestination] = useState("all");
  const [filtersApplied, setFiltersApplied] = useState(false);

  // Quick filters
  const [activeDisposition, setActiveDisposition] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<string | null>(null);

  // Table controls
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", mobile: "", notes: "", destination_id: "", channel: "", platform: "", campaign_type: "", ad_group: "",
  });

  // Fetch master values for filter dropdowns
  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("master_values").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, destinations(name), itineraries(headline), users!leads_assigned_to_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mvByType = (type: string) => masterValues.filter((v: any) => v.type === type);

  const createLead = useMutation({
    mutationFn: async (newLead: typeof form) => {
      const { error } = await supabase.from("leads").insert({
        traveller_code: "TEMP", // trigger will overwrite
        name: newLead.name,
        email: newLead.email || null,
        mobile: newLead.mobile || null,
        notes: newLead.notes || null,
        destination_id: newLead.destination_id || null,
        channel: newLead.channel || null,
        platform: newLead.platform || null,
        campaign_type: newLead.campaign_type || null,
        ad_group: newLead.ad_group || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDialogOpen(false);
      setForm({ name: "", email: "", mobile: "", notes: "", destination_id: "", channel: "", platform: "", campaign_type: "", ad_group: "" });
      toast.success("Lead created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create lead"),
  });

  // Apply all filters
  const filtered = useMemo(() => {
    return leads.filter((l: any) => {
      // Search
      const q = search.toLowerCase();
      if (q && !(
        l.name?.toLowerCase().includes(q) ||
        l.traveller_code?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.mobile?.includes(q)
      )) return false;

      // Master filters (only when applied)
      if (filtersApplied) {
        if (dateFrom && l.created_at && l.created_at < dateFrom) return false;
        if (dateTo && l.created_at && l.created_at > dateTo + "T23:59:59") return false;
        if (filterChannel !== "all" && l.channel !== filterChannel) return false;
        if (filterPlatform !== "all" && l.platform !== filterPlatform) return false;
        if (filterCampaign !== "all" && l.campaign_type !== filterCampaign) return false;
        if (filterAdGroup !== "all" && l.ad_group !== filterAdGroup) return false;
        if (filterDestination !== "all" && l.destination_id !== filterDestination) return false;
      }

      // Quick filters
      if (activeDisposition && l.disposition !== activeDisposition) return false;
      if (activeStatus && l.sales_status !== activeStatus) return false;

      return true;
    });
  }, [leads, search, filtersApplied, dateFrom, dateTo, filterChannel, filterPlatform, filterCampaign, filterAdGroup, filterDestination, activeDisposition, activeStatus]);

  // Counts for pills
  const dispositionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l: any) => { counts[l.disposition] = (counts[l.disposition] || 0) + 1; });
    return counts;
  }, [leads]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l: any) => { counts[l.sales_status] = (counts[l.sales_status] || 0) + 1; });
    return counts;
  }, [leads]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    if (filtered.length === 0) { toast.error("No data to export"); return; }
    const headers = ["Traveller Code", "Name", "Email", "Mobile", "Destination", "Disposition", "Sales Status", "Created"];
    const rows = filtered.map((l: any) => [
      l.traveller_code, l.name, l.email || "", l.mobile || "",
      l.destinations?.name || "", l.disposition || "", l.sales_status || "",
      l.created_at ? format(new Date(l.created_at), "dd/MM/yyyy") : "",
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `leads_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
    toast.success("Exported to CSV");
  };

  const resetFilters = () => {
    setDateFrom(format(startOfMonth(now), "yyyy-MM-dd"));
    setDateTo(format(endOfMonth(now), "yyyy-MM-dd"));
    setFilterChannel("all"); setFilterPlatform("all"); setFilterCampaign("all");
    setFilterAdGroup("all"); setFilterDestination("all");
    setFiltersApplied(false);
    setActiveDisposition(null); setActiveStatus(null);
    setCurrentPage(1);
  };

  const toggleAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((l: any) => l.id)));
  };

  return (
    <AppLayout title="Lead Management">
      {/* Master Filters */}
      <Card className="mb-4 border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Channel</Label>
              <Select value={filterChannel} onValueChange={setFilterChannel}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mvByType("channel").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Platform</Label>
              <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mvByType("platform").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Campaign Type</Label>
              <Select value={filterCampaign} onValueChange={setFilterCampaign}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mvByType("campaign_type").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ad Group</Label>
              <Select value={filterAdGroup} onValueChange={setFilterAdGroup}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {mvByType("ad_group").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Destination</Label>
              <Select value={filterDestination} onValueChange={setFilterDestination}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={() => { setFiltersApplied(true); setCurrentPage(1); }}>Apply Filter</Button>
            <Button size="sm" variant="outline" onClick={resetFilters}><RotateCcw className="h-3 w-3 mr-1" />Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Disposition Quick Filter */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Disposition</p>
        <div className="flex flex-wrap gap-1.5">
          {mvByType("disposition").map((d: any) => {
            const isActive = activeDisposition === d.value;
            const colorClass = DISPOSITION_COLORS[d.value] || "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <button
                key={d.id}
                onClick={() => { setActiveDisposition(isActive ? null : d.value); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${colorClass} ${isActive ? "ring-2 ring-offset-1 ring-primary" : "opacity-80 hover:opacity-100"}`}
              >
                {d.value}
                <span className="bg-white/60 rounded-full px-1.5 text-[10px] font-semibold">{dispositionCounts[d.value] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sales Status Quick Filter */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Sales Status</p>
        <div className="flex flex-wrap gap-1.5">
          {mvByType("sales_status").map((s: any) => {
            const isActive = activeStatus === s.value;
            const colorClass = STATUS_COLORS[s.value] || "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <button
                key={s.id}
                onClick={() => { setActiveStatus(isActive ? null : s.value); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${colorClass} ${isActive ? "ring-2 ring-offset-1 ring-primary" : "opacity-80 hover:opacity-100"}`}
              >
                {s.value}
                <span className="bg-white/60 rounded-full px-1.5 text-[10px] font-semibold">{statusCounts[s.value] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table toolbar */}
      <div className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" />Export
          </Button>
          <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{filtered.length} leads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-8 h-8 w-60 text-xs" />
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-3.5 w-3.5 mr-1" />Add Lead</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create New Lead</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); createLead.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div className="space-y-1"><Label className="text-xs">Mobile</Label><Input value={form.mobile} onChange={e => setForm({...form, mobile: e.target.value})} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Destination</Label>
                    <Select value={form.destination_id} onValueChange={v => setForm({...form, destination_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Channel</Label>
                    <Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mvByType("channel").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Platform</Label>
                    <Select value={form.platform} onValueChange={v => setForm({...form, platform: v})}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{mvByType("platform").map((v: any) => <SelectItem key={v.id} value={v.value}>{v.value}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} /></div>
                <Button type="submit" className="w-full" disabled={createLead.isPending}>{createLead.isPending ? "Creating..." : "Create Lead"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lead Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 text-table">#</TableHead>
                <TableHead className="w-10"><Checkbox checked={selectedIds.size === paginated.length && paginated.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="text-table">Traveller Code</TableHead>
                <TableHead className="text-table">Lead Date</TableHead>
                <TableHead className="text-table">Name</TableHead>
                <TableHead className="text-table">Email / Mobile</TableHead>
                <TableHead className="text-table">Itinerary</TableHead>
                <TableHead className="text-table">Destination</TableHead>
                <TableHead className="text-table">Disposition</TableHead>
                <TableHead className="text-table">Sales Status</TableHead>
                <TableHead className="text-table">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : paginated.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
              ) : (
                paginated.map((lead: any, idx: number) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30">
                    <TableCell className="text-table text-muted-foreground">{(currentPage - 1) * pageSize + idx + 1}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={v => {
                          const next = new Set(selectedIds);
                          v ? next.add(lead.id) : next.delete(lead.id);
                          setSelectedIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => navigate(`/leads/${lead.id}`)}
                        className="font-mono font-semibold text-[13px] hover:underline"
                        style={{ color: "hsl(var(--blaze))" }}
                      >
                        {lead.traveller_code}
                      </button>
                    </TableCell>
                    <TableCell className="text-table text-muted-foreground">
                      {lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-table font-medium">{lead.name}</TableCell>
                    <TableCell className="text-table">
                      <div className="text-[12px]">{lead.email || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{lead.mobile || ""}</div>
                    </TableCell>
                    <TableCell className="text-table text-[12px]">{(lead as any).itineraries?.headline || "—"}</TableCell>
                    <TableCell>
                      {lead.destinations?.name ? (
                        <Badge variant="secondary" className="text-[11px]">{lead.destinations.name}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${DISPOSITION_COLORS[lead.disposition] || ""}`}>
                        {lead.disposition || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] whitespace-nowrap ${STATUS_COLORS[lead.sales_status] || ""}`}>
                        {lead.sales_status || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => navigate(`/leads/${lead.id}`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-7 text-xs">Prev</Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
              if (page < 1 || page > totalPages) return null;
              return (
                <Button key={page} size="sm" variant={page === currentPage ? "default" : "outline"} onClick={() => setCurrentPage(page)} className="h-7 w-7 text-xs p-0">
                  {page}
                </Button>
              );
            })}
            <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-7 text-xs">Next</Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default LeadManagement;
