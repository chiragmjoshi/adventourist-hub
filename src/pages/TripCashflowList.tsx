import { useMemo, useState } from "react";
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
  // Period filter: 'all' | 'fy:YYYY' (Apr-Mar) | 'cy:YYYY' (Jan-Dec) | 'ym:YYYY-MM'
  const [periodFilter, setPeriodFilter] = useState<string>("all");

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

  // Build available periods from data
  const periodOptions = useMemo(() => {
    const fySet = new Set<number>();
    const cySet = new Set<number>();
    const ymSet = new Set<string>();
    cashflows.forEach((c: any) => {
      const d = c.travel_start_date ? new Date(c.travel_start_date) : null;
      if (!d || isNaN(d.getTime())) return;
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      cySet.add(y);
      const fyStart = m >= 4 ? y : y - 1;
      fySet.add(fyStart);
      ymSet.add(`${y}-${String(m).padStart(2, "0")}`);
    });
    return {
      fy: [...fySet].sort((a, b) => b - a),
      cy: [...cySet].sort((a, b) => b - a),
      ym: [...ymSet].sort().reverse(),
    };
  }, [cashflows]);

  const inPeriod = (cf: any) => {
    if (periodFilter === "all") return true;
    const d = cf.travel_start_date ? new Date(cf.travel_start_date) : null;
    if (!d || isNaN(d.getTime())) return false;
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    if (periodFilter.startsWith("fy:")) {
      const fyStart = parseInt(periodFilter.slice(3));
      const fyStartDate = new Date(fyStart, 3, 1); // Apr 1
      const fyEndDate = new Date(fyStart + 1, 3, 1); // next Apr 1
      return d >= fyStartDate && d < fyEndDate;
    }
    if (periodFilter.startsWith("cy:")) {
      return y === parseInt(periodFilter.slice(3));
    }
    if (periodFilter.startsWith("ym:")) {
      return `${y}-${String(m).padStart(2, "0")}` === periodFilter.slice(3);
    }
    return true;
  };

  // Apply period filter to the rows we summarise
  const periodCfs = cashflows.filter(inPeriod);
  filtered = filtered.filter(inPeriod);

  // Revenue-focused KPIs over the selected period
  const completedInPeriod = periodCfs.filter((c: any) => c.status === "completed");
  const revenue = completedInPeriod.reduce((s: number, c: any) => s + calcFinancials(c).sellingExGst, 0);
  const margin = completedInPeriod.reduce((s: number, c: any) => s + calcFinancials(c).marginAmount, 0);
  const vendorSpend = completedInPeriod.reduce((s: number, c: any) => s + calcFinancials(c).totalVendorCost, 0);
  const avgMarginPct = completedInPeriod.length > 0
    ? completedInPeriod.reduce((s: number, c: any) => s + calcFinancials(c).marginPct, 0) / completedInPeriod.length
    : 0;
  const totalPax = completedInPeriod.reduce((s: number, c: any) => s + (c.pax_count || 0), 0);
  const avgTicket = completedInPeriod.length > 0 ? revenue / completedInPeriod.length : 0;

  // Monthly trend within the selected period (or all-time if 'all')
  const monthlyTrend = useMemo(() => {
    const map = new Map<string, { revenue: number; margin: number; count: number }>();
    completedInPeriod.forEach((c: any) => {
      const d = c.travel_start_date ? new Date(c.travel_start_date) : null;
      if (!d || isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const fin = calcFinancials(c);
      const entry = map.get(key) || { revenue: 0, margin: 0, count: 0 };
      entry.revenue += fin.sellingExGst;
      entry.margin += fin.marginAmount;
      entry.count += 1;
      map.set(key, entry);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [completedInPeriod, vendorLines, settings]);

  const periodLabel = periodFilter === "all"
    ? "All time"
    : periodFilter.startsWith("fy:") ? `FY ${periodFilter.slice(3)}–${(parseInt(periodFilter.slice(3)) + 1).toString().slice(-2)}`
    : periodFilter.startsWith("cy:") ? `CY ${periodFilter.slice(3)}`
    : new Date(periodFilter.slice(3) + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <AppLayout title="Trip Cashflow">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Trip Cashflow</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {periodLabel} · {completedInPeriod.length} completed trips · {formatINR(revenue)} revenue · {formatINR(margin)} margin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="h-8 text-xs w-[180px] rounded-md"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent className="max-h-[400px]">
              <SelectItem value="all">All time</SelectItem>
              {periodOptions.fy.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Financial Year</div>
              )}
              {periodOptions.fy.map((y) => (
                <SelectItem key={`fy${y}`} value={`fy:${y}`}>FY {y}–{(y + 1).toString().slice(-2)}</SelectItem>
              ))}
              {periodOptions.cy.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Calendar Year</div>
              )}
              {periodOptions.cy.map((y) => (
                <SelectItem key={`cy${y}`} value={`cy:${y}`}>CY {y}</SelectItem>
              ))}
              {periodOptions.ym.length > 0 && (
                <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Month</div>
              )}
              {periodOptions.ym.map((ym) => (
                <SelectItem key={ym} value={`ym:${ym}`}>
                  {new Date(ym + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/trip-cashflow/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />New Cashflow
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3 my-4">
        {[
          { label: "Revenue", value: formatINR(revenue), sub: `${completedInPeriod.length} trips · ${totalPax} pax` },
          { label: "Margin", value: formatINR(margin), sub: `${avgMarginPct.toFixed(1)}% avg margin` },
          { label: "Vendor Spend", value: formatINR(vendorSpend), sub: "Cost paid out" },
          { label: "Avg Ticket Size", value: formatINR(avgTicket), sub: "Revenue per trip" },
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

      {/* Monthly trend strip */}
      {monthlyTrend.length > 1 && (
        <Card className="border-border/40 shadow-none mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-foreground">Monthly Revenue & Margin</p>
              <p className="text-[10px] text-muted-foreground">{periodLabel}</p>
            </div>
            <div className="flex items-end gap-1 h-24">
              {(() => {
                const maxRev = Math.max(...monthlyTrend.map(([, v]) => v.revenue), 1);
                return monthlyTrend.map(([key, v]) => {
                  const h = (v.revenue / maxRev) * 100;
                  const mh = v.revenue > 0 ? (v.margin / v.revenue) * h : 0;
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full bg-[hsl(var(--lagoon))]/15 rounded-t relative" style={{ height: `${h}%` }}>
                        <div className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--ridge))] rounded-t" style={{ height: `${mh}%` }} />
                      </div>
                      <div className="absolute -top-12 hidden group-hover:block bg-popover border border-border/40 rounded-md px-2 py-1 text-[10px] whitespace-nowrap z-10 shadow-sm">
                        <div className="font-medium">{new Date(key + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</div>
                        <div className="text-[hsl(var(--lagoon))]">Rev: {formatINR(v.revenue)}</div>
                        <div className="text-[hsl(var(--ridge))]">Margin: {formatINR(v.margin)}</div>
                        <div className="text-muted-foreground">{v.count} trips</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
              <span>{new Date(monthlyTrend[0][0] + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</span>
              <span>{new Date(monthlyTrend[monthlyTrend.length - 1][0] + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</span>
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[hsl(var(--lagoon))]/40" />Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[hsl(var(--ridge))]" />Margin</span>
            </div>
          </CardContent>
        </Card>
      )}

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
