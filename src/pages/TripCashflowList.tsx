import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { formatINR } from "@/lib/formatINR";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/40",
  in_progress: "text-[hsl(var(--horizon))] bg-[hsl(var(--horizon))]/10",
  completed: "text-[hsl(var(--ridge))] bg-[hsl(var(--ridge))]/10",
  cancelled: "text-destructive bg-destructive/10",
};

const TripCashflowList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [destFilter, setDestFilter] = useState("_all");
  const [assignedFilter, setAssignedFilter] = useState("_all");

  const { data: cashflows = [], isLoading } = useQuery({
    queryKey: ["trip_cashflow_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_cashflow").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: vendorLines = [] } = useQuery({
    queryKey: ["all_vendor_lines"],
    queryFn: async () => {
      const { data } = await supabase.from("trip_cashflow_vendors").select("*");
      return data || [];
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_all"],
    queryFn: async () => { const { data } = await supabase.from("destinations").select("id, name").order("name"); return data || []; },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => { const { data } = await supabase.from("users").select("id, name"); return data || []; },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  const gstRate = parseFloat(settings.find((s: any) => s.key === "gst_rate")?.value || "5");

  const getVendorTotal = (cfId: string) => {
    return vendorLines.filter((l: any) => l.cashflow_id === cfId).reduce((s: number, l: any) => s + parseFloat(l.cost_per_pax_incl_gst || 0), 0);
  };

  const calcFinancials = (cf: any) => {
    const vendorCostPerPax = getVendorTotal(cf.id);
    const pax = cf.pax_count || 1;
    const totalVendorCost = vendorCostPerPax * pax;
    const marginPct = parseFloat(cf.margin_percent || 0);
    const marginAmount = totalVendorCost * (marginPct / 100);
    const sellingExGst = totalVendorCost + marginAmount;
    const gstAmount = cf.gst_billing ? sellingExGst * (gstRate / 100) : 0;
    const finalPrice = sellingExGst + gstAmount;
    return { totalVendorCost, marginAmount, sellingExGst, gstAmount, finalPrice, marginPct };
  };

  // Filters
  let filtered = cashflows.filter((cf: any) => {
    if (search && !cf.traveller_name?.toLowerCase().includes(search.toLowerCase()) && !cf.traveller_code?.toLowerCase().includes(search.toLowerCase()) && !cf.cashflow_code?.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && cf.status !== statusFilter) return false;
    if (destFilter !== "_all" && cf.destination_id !== destFilter) return false;
    if (assignedFilter !== "_all" && cf.assigned_to !== assignedFilter) return false;
    return true;
  });

  const completedCfs = cashflows.filter((c: any) => c.status === "completed");
  const pipelineCfs = cashflows.filter((c: any) => c.status === "draft" || c.status === "in_progress");
  const totalRevenue = completedCfs.reduce((s: number, c: any) => s + calcFinancials(c).sellingExGst, 0);
  const totalMargin = completedCfs.reduce((s: number, c: any) => s + calcFinancials(c).marginAmount, 0);
  const avgMargin = completedCfs.length > 0 ? completedCfs.reduce((s: number, c: any) => s + calcFinancials(c).marginPct, 0) / completedCfs.length : 0;
  const pipelineValue = pipelineCfs.reduce((s: number, c: any) => s + calcFinancials(c).sellingExGst, 0);

  const getDestName = (id: string) => destinations.find((d: any) => d.id === id)?.name || "—";
  const filtersActive = search || statusFilter !== "all" || destFilter !== "_all" || assignedFilter !== "_all";

  return (
    <AppLayout title="Trip Cashflow">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Trip Cashflow</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {cashflows.length} trips · {formatINR(totalRevenue)} confirmed revenue · {formatINR(pipelineValue)} pipeline
          </p>
        </div>
        <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/trip-cashflow/new")}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Cashflow
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 my-4">
        {[
          { label: "Total Revenue", value: formatINR(totalRevenue), sub: "Completed trips" },
          { label: "Total Margin", value: formatINR(totalMargin), sub: "Completed trips" },
          { label: "Avg Margin %", value: avgMargin.toFixed(1) + "%", sub: "Completed trips" },
          { label: "Pipeline Value", value: formatINR(pipelineValue), sub: `${pipelineCfs.length} trips` },
        ].map((c, i) => (
          <Card key={i} className="border-border/40 shadow-none">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-semibold mt-1">{c.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 py-3 border-b border-border/40 mb-4">
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 rounded-md text-xs" />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px] rounded-md"><SelectValue placeholder="Destination" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Destinations</SelectItem>
            {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex bg-muted/40 rounded-md p-0.5">
          {["all", "draft", "in_progress", "completed", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all capitalize ${statusFilter === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s === "in_progress" ? "In Progress" : s}
            </button>
          ))}
        </div>
        <Select value={assignedFilter} onValueChange={setAssignedFilter}>
          <SelectTrigger className="h-8 text-xs w-[140px] rounded-md"><SelectValue placeholder="Assigned To" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Users</SelectItem>
            {users.map((u: any) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtersActive && (
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setDestFilter("_all"); setAssignedFilter("_all"); }}
            className="text-xs text-primary hover:underline ml-1">Clear</button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="rounded-md text-xs"><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40 shadow-none">
          <CardContent className="py-16 text-center">
            <Trophy className="h-12 w-12 mx-auto text-primary/60 mb-3" />
            <p className="text-base font-medium text-foreground mb-1">No cashflow entries yet</p>
            <p className="text-sm text-muted-foreground mb-4">Close a lead as File Closed to create your first cashflow entry</p>
            <Button size="sm" onClick={() => navigate("/admin/trip-cashflow/new")} className="rounded-md">Create Manually</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Code</th>
                <th className="text-left px-4 py-2.5 font-medium">Traveller</th>
                <th className="text-left px-4 py-2.5 font-medium">Destination</th>
                <th className="text-left px-4 py-2.5 font-medium">Travel Dates</th>
                <th className="text-center px-3 py-2.5 font-medium">Pax</th>
                <th className="text-right px-4 py-2.5 font-medium">Vendor Cost</th>
                <th className="text-right px-4 py-2.5 font-medium">Selling Price</th>
                <th className="text-right px-4 py-2.5 font-medium">Margin</th>
                <th className="text-center px-3 py-2.5 font-medium">GST</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cf: any) => {
                const fin = calcFinancials(cf);
                const marginColor = fin.marginPct > 15 ? "text-[hsl(var(--ridge))]" : fin.marginPct >= 10 ? "text-[hsl(var(--horizon))]" : "text-destructive";
                const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";
                return (
                  <tr key={cf.id} onClick={() => navigate(`/admin/trip-cashflow/${cf.id}`)}
                    className="border-t border-border/30 hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary">{cf.cashflow_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{cf.traveller_name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{cf.traveller_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] rounded-md bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0">
                        {cf.destination_id ? getDestName(cf.destination_id) : "—"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {fmtDate(cf.travel_start_date)} → {fmtDate(cf.travel_end_date)}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{cf.pax_count}</td>
                    <td className="px-4 py-3 text-right text-xs">{formatINR(fin.totalVendorCost)}</td>
                    <td className="px-4 py-3 text-right text-xs font-medium">{formatINR(fin.sellingExGst)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${marginColor}`}>{formatINR(fin.marginAmount)}</span>
                      <p className="text-[10px] text-muted-foreground">{fin.marginPct.toFixed(1)}%</p>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <Badge variant="outline" className={`text-[10px] rounded-full ${cf.gst_billing ? "text-blue-600 border-blue-200 bg-blue-50" : "text-muted-foreground"}`}>
                        {cf.gst_billing ? "GST" : "No GST"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] rounded-full capitalize ${STATUS_COLORS[cf.status] || ""}`}>
                        {cf.status?.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default TripCashflowList;
