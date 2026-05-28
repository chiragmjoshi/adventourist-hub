import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ComposedChart, Line, Area, AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Pencil, Minus, CalendarIcon } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";

/* ───────── brand colors ───────── */
const BLAZE = "#FF6F4C";
const HORIZON = "#FDC436";
const ABYSS = "#1A1D2E";
const LAGOON = "#64CBB9";
const RIDGE = "#056147";
const DRIFT = "#EEE5D5";

const REFETCH_MS = 60_000;

/* ───────── types ───────── */
type PeriodKey =
  | "this_month"
  | "last_3m"
  | "last_6m"
  | "last_12m"
  | "ytd"
  | "this_fy"
  | "last_fy"
  | "all_time"
  | "custom";

interface MonthlyRow {
  monthLabel: string;
  monthKey: string;        // YYYY-MM
  monthStart: Date;
  monthEnd: Date;          // exclusive
  leads: number;
  filesClosed: number;
  conversionRate: number;
  revenue: number;
  vendorCost: number;
  grossMargin: number;
  marginPct: number;
  expenses: number;
  netMargin: number;
  netMarginPct: number;
}

interface LifetimeStats {
  totalLeads: number;
  totalClosed: number;
  avgMonthlyLeads: number;
  avgMonthlyClosed: number;
  avgTicket: number;
  conversionRate: number;
}

interface DashboardData {
  monthly: MonthlyRow[];
  lifetime: LifetimeStats;
  topDestThisMonth: { name: string; count: number }[];
  topDestRevenueThisMonth: { name: string; revenue: number }[];
  funnelThisMonth: { stage: string; count: number; pct: number; fill: string }[];
  sourceMixThisMonth: { name: string; value: number; pct: number; fill: string }[];
  totalLeadsThisMonth: number;
}

/* ───────── helpers ───────── */
const monthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

const fmtCompactINR = (n: number) => {
  if (!isFinite(n) || n === 0) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)} L`;
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};

const pct = (n: number) => `${n.toFixed(1)}%`;

const deltaPct = (curr: number, prev: number): number => {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
};

/* Indian financial year: Apr 1 → Mar 31 */
function fyStart(year: number) { return new Date(year, 3, 1); } // Apr 1
function currentFyStartYear(now: Date) {
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

/* Resolve a preset to {from, to} where `to` is INCLUSIVE end-of-day date.
   Custom is resolved by the caller. */
function resolvePreset(p: PeriodKey, customFrom?: Date, customTo?: Date):
  { from: Date; to: Date } {
  const now = new Date();
  const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (p === "this_month")
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfThisMonth };
  if (p === "last_3m")
    return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: endOfThisMonth };
  if (p === "last_6m")
    return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1), to: endOfThisMonth };
  if (p === "last_12m")
    return { from: new Date(now.getFullYear(), now.getMonth() - 11, 1), to: endOfThisMonth };
  if (p === "ytd")
    return { from: new Date(now.getFullYear(), 0, 1), to: endOfThisMonth };
  if (p === "this_fy") {
    const y = currentFyStartYear(now);
    return { from: fyStart(y), to: endOfThisMonth };
  }
  if (p === "last_fy") {
    const y = currentFyStartYear(now) - 1;
    return { from: fyStart(y), to: new Date(y + 1, 2, 31) }; // Mar 31 next yr
  }
  if (p === "all_time")
    return { from: new Date(2018, 0, 1), to: endOfThisMonth };
  // custom
  return {
    from: customFrom ?? new Date(now.getFullYear(), now.getMonth(), 1),
    to: customTo ?? endOfThisMonth,
  };
}

/* Inclusive→exclusive month window aligned to month boundaries */
function toMonthWindow(from: Date, to: Date) {
  const start = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth() + 1, 1);
  return { start, end };
}

/* Effective date a cashflow row is "booked" on, for revenue rollups.
   Legacy imports often have only travel_start_date; new rows have booking_date.
   created_at is the import timestamp and must NOT be used for legacy data. */
function cashflowEffectiveDate(c: { booking_date?: string | null; travel_start_date?: string | null; created_at?: string | null; }): Date | null {
  const s = c.booking_date ?? c.travel_start_date ?? c.created_at ?? null;
  return s ? new Date(s) : null;
}

/* ───────── main fetch ───────── */
async function fetchDashboardData(): Promise<DashboardData> {
  const now = new Date();

  const [leadsRes, cashflowRes, expensesRes, destinationsRes] = await Promise.all([
    supabase.from("leads")
      .select("id, created_at, sales_status, destination_id, platform")
      .limit(50000),
    supabase.from("trip_cashflow")
      .select("id, lead_id, pax_count, margin_percent, created_at, booking_date, travel_start_date, destination_id, trip_stage")
      .limit(50000),
    supabase.from("monthly_expenses").select("*").limit(1000),
    supabase.from("destinations").select("id, name").limit(1000),
  ]);

  const cashflows = cashflowRes.data ?? [];
  const vendorRes = cashflows.length
    ? await supabase.from("trip_cashflow_vendors")
        .select("cashflow_id, cost_per_pax_incl_gst")
        .in("cashflow_id", cashflows.map((c) => c.id))
        .limit(50000)
    : { data: [] as any[] };

  // vendor cost per cashflow (sum of cost_per_pax_incl_gst rows)
  const vendorCostByCashflow = new Map<string, number>();
  for (const v of (vendorRes.data ?? []) as any[]) {
    vendorCostByCashflow.set(
      v.cashflow_id,
      (vendorCostByCashflow.get(v.cashflow_id) ?? 0) + Number(v.cost_per_pax_incl_gst ?? 0),
    );
  }

  // per-cashflow derived numbers, dated by booking → travel → created
  const cashflowDerived = cashflows.map((c: any) => {
    const vendorCostPerPax = vendorCostByCashflow.get(c.id) ?? 0;
    const pax = Number(c.pax_count ?? 1) || 1;
    const totalVendorCost = vendorCostPerPax * pax;
    const m = Number(c.margin_percent ?? 0);
    const sellingPrice = m < 100 ? totalVendorCost / (1 - m / 100) : totalVendorCost;
    const effective = cashflowEffectiveDate(c);
    return {
      id: c.id,
      effective_at: effective,
      destination_id: c.destination_id,
      sellingPrice,
      totalVendorCost,
      grossMargin: sellingPrice - totalVendorCost,
    };
  });

  const expensesByMonth = new Map<string, number>();
  for (const e of expensesRes.data ?? []) {
    expensesByMonth.set(e.month_year, Number(e.amount ?? 0));
  }

  // Determine the earliest month we need to roll up. Use the earliest
  // signal across leads + dated cashflows; cap to 6 years back to keep
  // the array bounded. Always include current month.
  let earliest = new Date(now.getFullYear(), now.getMonth(), 1);
  for (const l of leadsRes.data ?? []) {
    const d = new Date((l as any).created_at);
    if (d < earliest) earliest = new Date(d.getFullYear(), d.getMonth(), 1);
  }
  for (const c of cashflowDerived) {
    if (!c.effective_at) continue;
    if (c.effective_at < earliest)
      earliest = new Date(c.effective_at.getFullYear(), c.effective_at.getMonth(), 1);
  }
  const sixYearsAgo = new Date(now.getFullYear() - 6, now.getMonth(), 1);
  if (earliest < sixYearsAgo) earliest = sixYearsAgo;

  const monthsBetween =
    (now.getFullYear() - earliest.getFullYear()) * 12 +
    (now.getMonth() - earliest.getMonth());

  // build month rows from earliest → current
  const months: MonthlyRow[] = [];
  for (let i = monthsBetween; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = d;
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const key = monthKey(d);

    const monthLeads = (leadsRes.data ?? []).filter((l: any) => {
      const ts = new Date(l.created_at);
      return ts >= start && ts < end;
    });
    const filesClosed = monthLeads.filter((l: any) => l.sales_status === "file_closed").length;

    const monthCash = cashflowDerived.filter((c) => {
      if (!c.effective_at) return false;
      return c.effective_at >= start && c.effective_at < end;
    });
    const revenue = monthCash.reduce((s, c) => s + c.sellingPrice, 0);
    const vendorCost = monthCash.reduce((s, c) => s + c.totalVendorCost, 0);
    const grossMargin = revenue - vendorCost;
    const expenses = expensesByMonth.get(key) ?? 0;
    const netMargin = grossMargin - expenses;

    months.push({
      monthLabel: monthLabel(d),
      monthKey: key,
      monthStart: start,
      monthEnd: end,
      leads: monthLeads.length,
      filesClosed,
      conversionRate: monthLeads.length > 0 ? (filesClosed / monthLeads.length) * 100 : 0,
      revenue,
      vendorCost,
      grossMargin,
      marginPct: revenue > 0 ? (grossMargin / revenue) * 100 : 0,
      expenses,
      netMargin,
      netMarginPct: revenue > 0 ? (netMargin / revenue) * 100 : 0,
    });
  }

  /* lifetime — all-time, no filter */
  const [allLeadsCount, allClosedCount, allCashflowsRes, firstLeadRes] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("sales_status", "file_closed"),
    supabase.from("trip_cashflow").select("id, pax_count, margin_percent").limit(50000),
    supabase.from("leads").select("created_at").order("created_at", { ascending: true }).limit(1),
  ]);
  const allCashIds = (allCashflowsRes.data ?? []).map((c: any) => c.id);
  let allCashVendors: any[] = [];
  if (allCashIds.length) {
    const r = await supabase.from("trip_cashflow_vendors")
      .select("cashflow_id, cost_per_pax_incl_gst")
      .in("cashflow_id", allCashIds)
      .limit(100000);
    allCashVendors = r.data ?? [];
  }
  const allVendorByCash = new Map<string, number>();
  for (const v of allCashVendors) {
    allVendorByCash.set(v.cashflow_id, (allVendorByCash.get(v.cashflow_id) ?? 0) + Number(v.cost_per_pax_incl_gst ?? 0));
  }
  let allRevenue = 0;
  for (const c of (allCashflowsRes.data ?? []) as any[]) {
    const vp = allVendorByCash.get(c.id) ?? 0;
    const pax = Number(c.pax_count ?? 1) || 1;
    const tvc = vp * pax;
    const m = Number(c.margin_percent ?? 0);
    const sp = m < 100 ? tvc / (1 - m / 100) : tvc;
    allRevenue += sp;
  }
  const totalLeads = allLeadsCount.count ?? 0;
  const totalClosed = allClosedCount.count ?? 0;
  const firstLeadAt = firstLeadRes.data?.[0]?.created_at;
  let monthsActive = 1;
  if (firstLeadAt) {
    const f = new Date(firstLeadAt);
    monthsActive = Math.max(
      1,
      (now.getFullYear() - f.getFullYear()) * 12 + (now.getMonth() - f.getMonth()) + 1,
    );
  }

  const lifetime: LifetimeStats = {
    totalLeads,
    totalClosed,
    avgMonthlyLeads: totalLeads / monthsActive,
    avgMonthlyClosed: totalClosed / monthsActive,
    avgTicket: totalClosed > 0 ? allRevenue / totalClosed : 0,
    conversionRate: totalLeads > 0 ? (totalClosed / totalLeads) * 100 : 0,
  };

  /* This-month destinations + funnel + source mix */
  const thisMonth = months[months.length - 1];
  const destMap = new Map<string, string>();
  for (const d of destinationsRes.data ?? []) destMap.set(d.id, d.name);

  const thisMonthLeads = (leadsRes.data ?? []).filter((l: any) => {
    const ts = new Date(l.created_at);
    return ts >= thisMonth.monthStart && ts < thisMonth.monthEnd;
  });

  const destCount = new Map<string, number>();
  for (const l of thisMonthLeads) {
    if (!l.destination_id) continue;
    const name = destMap.get(l.destination_id);
    if (!name) continue;
    destCount.set(name, (destCount.get(name) ?? 0) + 1);
  }
  const topDestThisMonth = [...destCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const destRev = new Map<string, number>();
  for (const c of cashflowDerived) {
    if (!c.effective_at) continue;
    if (c.effective_at < thisMonth.monthStart || c.effective_at >= thisMonth.monthEnd) continue;
    if (!c.destination_id) continue;
    const name = destMap.get(c.destination_id);
    if (!name) continue;
    destRev.set(name, (destRev.get(name) ?? 0) + c.sellingPrice);
  }
  const topDestRevenueThisMonth = [...destRev.entries()]
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  const funnelStages: { key: string; label: string; fill: string }[] = [
    { key: "new_lead", label: "New", fill: LAGOON },
    { key: "contacted", label: "Contacted", fill: HORIZON },
    { key: "quote_sent", label: "Quote Sent", fill: BLAZE },
    { key: "file_closed", label: "File Closed", fill: RIDGE },
  ];
  const stageCounts: Record<string, number> = {};
  for (const l of thisMonthLeads) {
    const s = (l as any).sales_status ?? "new_lead";
    stageCounts[s] = (stageCounts[s] ?? 0) + 1;
  }
  const funnelTotal = thisMonthLeads.length || 1;
  const funnelThisMonth = funnelStages.map((s) => ({
    stage: s.label,
    count: stageCounts[s.key] ?? 0,
    pct: ((stageCounts[s.key] ?? 0) / funnelTotal) * 100,
    fill: s.fill,
  }));

  const sourceCounts = new Map<string, number>();
  for (const l of thisMonthLeads) {
    const p = ((l as any).platform ?? "Unknown") || "Unknown";
    sourceCounts.set(p, (sourceCounts.get(p) ?? 0) + 1);
  }
  const sourcePalette = [BLAZE, HORIZON, LAGOON, RIDGE, ABYSS];
  const sourceTotal = thisMonthLeads.length || 1;
  const sourceMixThisMonth = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      pct: (value / sourceTotal) * 100,
      fill: sourcePalette[i % sourcePalette.length],
    }));

  return {
    monthly: months,
    lifetime,
    topDestThisMonth,
    topDestRevenueThisMonth,
    funnelThisMonth,
    sourceMixThisMonth,
    totalLeadsThisMonth: thisMonthLeads.length,
  };
}

/* ───────── component ───────── */
const Dashboard = () => {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const { profile } = useAuth();
  const canEditExpenses = profile?.role === "super_admin" || profile?.role === "admin";
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-bi"],
    queryFn: fetchDashboardData,
    refetchInterval: REFETCH_MS,
  });

  if (isLoading || !data) {
    return (
      <AppLayout title="Dashboard">
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <DashboardBody
        data={data}
        period={period}
        setPeriod={setPeriod}
        customFrom={customFrom}
        customTo={customTo}
        setCustom={(f, t) => { setCustomFrom(f); setCustomTo(t); setPeriod("custom"); }}
        canEditExpenses={canEditExpenses}
        onExpenseSaved={() => qc.invalidateQueries({ queryKey: ["dashboard-bi"] })}
      />
    </AppLayout>
  );
};

export default Dashboard;

/* ───────── body ───────── */
const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_3m", label: "Last 3M" },
  { key: "last_6m", label: "Last 6M" },
  { key: "last_12m", label: "Last 12M" },
  { key: "ytd", label: "YTD" },
  { key: "this_fy", label: "This FY" },
  { key: "last_fy", label: "Last FY" },
  { key: "all_time", label: "All Time" },
];

function DashboardBody({
  data, period, setPeriod, customFrom, customTo, setCustom, canEditExpenses, onExpenseSaved,
}: {
  data: DashboardData;
  period: PeriodKey;
  setPeriod: (p: PeriodKey) => void;
  customFrom?: Date;
  customTo?: Date;
  setCustom: (from: Date, to: Date) => void;
  canEditExpenses: boolean;
  onExpenseSaved: () => void;
}) {
  const window = useMemo(() => {
    const r = resolvePreset(period, customFrom, customTo);
    const w = toMonthWindow(r.from, r.to);
    const monthsLen = Math.max(
      1,
      (w.end.getFullYear() - w.start.getFullYear()) * 12 +
        (w.end.getMonth() - w.start.getMonth()),
    );
    const priorEnd = new Date(w.start);
    const priorStart = new Date(w.start.getFullYear(), w.start.getMonth() - monthsLen, 1);
    return { ...w, priorStart, priorEnd, from: r.from, to: r.to };
  }, [period, customFrom, customTo]);

  const periodMonths = data.monthly.filter((m) => m.monthStart >= window.start && m.monthStart < window.end);
  const priorMonths = data.monthly.filter((m) => m.monthStart >= window.priorStart && m.monthStart < window.priorEnd);

  const agg = (rows: MonthlyRow[]) => {
    const leads = rows.reduce((s, r) => s + r.leads, 0);
    const closed = rows.reduce((s, r) => s + r.filesClosed, 0);
    const revenue = rows.reduce((s, r) => s + r.revenue, 0);
    const vendorCost = rows.reduce((s, r) => s + r.vendorCost, 0);
    const grossMargin = revenue - vendorCost;
    const expenses = rows.reduce((s, r) => s + r.expenses, 0);
    const netMargin = grossMargin - expenses;
    return {
      leads, closed, revenue, vendorCost, grossMargin, expenses, netMargin,
      conv: leads > 0 ? (closed / leads) * 100 : 0,
      grossPct: revenue > 0 ? (grossMargin / revenue) * 100 : 0,
      netPct: revenue > 0 ? (netMargin / revenue) * 100 : 0,
    };
  };
  const curr = agg(periodMonths);
  const prev = agg(priorMonths);

  // sparkline data — last 6 months
  const last6 = data.monthly.slice(-6);
  // 12-month performance chart — always last 12 months
  const last12 = data.monthly.slice(-12);

  // this-vs-last comparison (always current vs prior calendar month)
  const tm = data.monthly[data.monthly.length - 1];
  const lm = data.monthly[data.monthly.length - 2];

  return (
    <div className="space-y-6">
      {/* SECTION A — Period selector */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground hidden md:inline">
          {format(window.from, "d MMM yyyy")} – {format(window.to, "d MMM yyyy")}
        </span>
        <div className="inline-flex flex-wrap rounded-lg border border-border bg-white p-1 shadow-sm">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                (period === opt.key
                  ? "bg-abyss text-white"
                  : "text-muted-foreground hover:text-abyss")
              }
            >
              {opt.label}
            </button>
          ))}
          <CustomRangePicker
            active={period === "custom"}
            from={customFrom}
            to={customTo}
            onChange={setCustom}
          />
        </div>
      </div>

      {/* SECTION B — KPI strip */}
      <SectionTitle>Performance Snapshot</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          accent={LAGOON} title="Total Leads"
          value={curr.leads.toLocaleString("en-IN")}
          delta={deltaPct(curr.leads, prev.leads)}
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.leads }))}
          sparkColor={LAGOON}
        />
        <KpiCard
          accent={LAGOON} title="Files Closed"
          value={curr.closed.toLocaleString("en-IN")}
          delta={deltaPct(curr.closed, prev.closed)}
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.filesClosed }))}
          sparkColor={LAGOON}
        />
        <KpiCard
          accent={LAGOON} title="Conversion Rate"
          value={pct(curr.conv)}
          delta={curr.conv - prev.conv}
          deltaSuffix="pp" isPP
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.conversionRate }))}
          sparkColor={LAGOON}
        />
        <KpiCard
          accent={BLAZE} title="Revenue"
          value={fmtCompactINR(curr.revenue)}
          delta={deltaPct(curr.revenue, prev.revenue)}
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.revenue }))}
          sparkColor={BLAZE}
        />
        <KpiCard
          accent={BLAZE} title="Gross Margin %"
          value={pct(curr.grossPct)}
          delta={curr.grossPct - prev.grossPct}
          deltaSuffix="pp" isPP
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.marginPct }))}
          sparkColor={BLAZE}
        />
        <KpiCard
          accent={BLAZE} title="Net Margin %"
          value={pct(curr.netPct)}
          delta={curr.netPct - prev.netPct}
          deltaSuffix="pp" isPP
          spark={last6.map((m) => ({ x: m.monthLabel, y: m.netMarginPct }))}
          sparkColor={BLAZE}
        />
      </div>

      {/* SECTION C — Combo chart */}
      <SectionTitle>12-Month Business Performance</SectionTitle>
      <div className="bg-white border border-border rounded-xl shadow-sm p-5">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={last12} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
              formatter={(value: any, name: string) => {
                if (name === "Revenue (₹L)") return [`₹${Number(value).toFixed(1)}L`, name];
                if (name === "Gross Margin %") return [`${Number(value).toFixed(1)}%`, name];
                return [Number(value).toLocaleString("en-IN"), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="left" dataKey="leads" name="Leads" fill={LAGOON} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="filesClosed" name="Files Closed" fill={RIDGE} radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey={(d: MonthlyRow) => d.revenue / 1e5}
              name="Revenue (₹L)"
              stroke={BLAZE}
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="marginPct"
              name="Gross Margin %"
              stroke={HORIZON}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION D — two col */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* LEFT 60% */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-border rounded-xl shadow-sm p-5">
            <SectionTitle className="mb-3">Revenue · Margin · Expenses — Monthly Breakdown</SectionTitle>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={periodMonths.length > 0 ? periodMonths : last12} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `₹${(v / 1e5).toFixed(0)}L`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }}
                  formatter={(value: any, name: string) => {
                    if (name === "Net Margin %") return [`${Number(value).toFixed(1)}%`, name];
                    return [fmtCompactINR(Number(value)), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="vendorCost" stackId="a" name="Vendor Cost" fill={DRIFT} stroke={ABYSS} />
                <Bar yAxisId="left" dataKey="grossMargin" stackId="a" name="Gross Margin" fill={BLAZE} />
                <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill={HORIZON} />
                <Line yAxisId="right" type="monotone" dataKey="netMarginPct" name="Net Margin %" stroke={RIDGE} strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* Compact table — last 6 months */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 font-medium">Month</th>
                    <th className="py-2 font-medium text-right">Revenue</th>
                    <th className="py-2 font-medium text-right">Gross Margin</th>
                    <th className="py-2 font-medium text-right">Expenses</th>
                    <th className="py-2 font-medium text-right">Net Margin</th>
                    <th className="py-2 font-medium text-right">Conv %</th>
                    {canEditExpenses && <th className="py-2 w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {data.monthly.slice(-6).map((m) => (
                    <tr key={m.monthKey} className="border-b border-border/50 last:border-0">
                      <td className="py-2 text-abyss font-medium">{m.monthLabel}</td>
                      <td className="py-2 text-right">{fmtCompactINR(m.revenue)}</td>
                      <td className="py-2 text-right">{fmtCompactINR(m.grossMargin)}</td>
                      <td className="py-2 text-right">{fmtCompactINR(m.expenses)}</td>
                      <td className={"py-2 text-right font-medium " + (m.netMargin >= 0 ? "text-ridge" : "text-destructive")}>
                        {fmtCompactINR(m.netMargin)}
                      </td>
                      <td className="py-2 text-right">{pct(m.conversionRate)}</td>
                      {canEditExpenses && (
                        <td className="py-2 text-right">
                          <ExpenseEditor month={m} onSaved={onExpenseSaved} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Lifetime */}
          <div className="bg-drift/40 border border-border rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-abyss mb-3">Lifetime Business Snapshot</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Stat label="Total Leads" value={data.lifetime.totalLeads.toLocaleString("en-IN")} />
              <Stat label="Total Trips Closed" value={data.lifetime.totalClosed.toLocaleString("en-IN")} />
              <Stat label="Avg Monthly Leads" value={data.lifetime.avgMonthlyLeads.toFixed(0)} />
              <Stat label="Avg Monthly Closures" value={data.lifetime.avgMonthlyClosed.toFixed(1)} />
              <Stat label="Avg Ticket Size" value={fmtCompactINR(data.lifetime.avgTicket)} />
              <Stat label="Conversion Rate" value={pct(data.lifetime.conversionRate)} />
            </div>
          </div>

          {/* This Month vs Last Month */}
          <div className="bg-white border border-border rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">This Month vs Last Month</h3>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 font-medium">Metric</th>
                  <th className="py-2 font-medium text-right">This</th>
                  <th className="py-2 font-medium text-right">Last</th>
                  <th className="py-2 font-medium text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                <CmpRow label="Leads" curr={tm.leads} prev={lm.leads} />
                <CmpRow label="Closed" curr={tm.filesClosed} prev={lm.filesClosed} />
                <CmpRow label="Revenue" curr={tm.revenue} prev={lm.revenue} formatter={fmtCompactINR} />
                <CmpRow label="Gross Margin %" curr={tm.marginPct} prev={lm.marginPct} isPP />
                <CmpRow label="Expenses" curr={tm.expenses} prev={lm.expenses} formatter={fmtCompactINR} />
                <CmpRow label="Net Margin %" curr={tm.netMarginPct} prev={lm.netMarginPct} isPP />
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION E — bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Destinations */}
        <div className="bg-white border border-border rounded-xl shadow-sm p-5">
          <SectionTitle className="mb-3">Top Destinations (This Month)</SectionTitle>
          {data.topDestThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No destination data this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topDestThisMonth} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EEE" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                <Bar dataKey="count" fill={BLAZE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          {data.topDestRevenueThisMonth.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">By revenue this month</p>
              <div className="flex flex-wrap gap-1.5">
                {data.topDestRevenueThisMonth.map((d) => (
                  <span key={d.name} className="text-xs px-2 py-1 rounded-full bg-blaze/10 text-blaze font-medium">
                    {d.name} · {fmtCompactINR(d.revenue)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Funnel */}
        <div className="bg-white border border-border rounded-xl shadow-sm p-5">
          <SectionTitle className="mb-3">Conversion Funnel (This Month)</SectionTitle>
          {data.totalLeadsThisMonth === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No leads this month.</p>
          ) : (
            <div className="space-y-2">
              {data.funnelThisMonth.map((f) => (
                <div key={f.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-abyss">{f.stage}</span>
                    <span className="text-muted-foreground">
                      <span className="text-abyss font-semibold">{f.count}</span> · {f.pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-6 rounded-md bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{ width: `${Math.max(f.pct, 1.5)}%`, background: f.fill }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Source mix */}
        <div className="bg-white border border-border rounded-xl shadow-sm p-5">
          <SectionTitle className="mb-3">Lead Source Mix (This Month)</SectionTitle>
          {data.sourceMixThisMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No source data this month.</p>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.sourceMixThisMonth}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.sourceMixThisMonth.map((s, i) => (<Cell key={i} fill={s.fill} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ height: 200 }}>
                <div className="text-xl font-semibold text-abyss leading-none">{data.totalLeadsThisMonth}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Leads</div>
              </div>
              <div className="mt-3 space-y-1.5">
                {data.sourceMixThisMonth.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.fill }} />
                      <span className="text-abyss font-medium truncate">{s.name}</span>
                    </div>
                    <div className="text-muted-foreground shrink-0 ml-2">
                      <span className="text-abyss font-semibold">{s.value}</span> · {s.pct.toFixed(0)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── tiny components ───────── */
function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={"text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 " + className}>
      {children}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold text-abyss mt-0.5">{value}</div>
    </div>
  );
}

function KpiCard({
  accent, title, value, delta, deltaSuffix = "%", isPP = false, spark, sparkColor,
}: {
  accent: string;
  title: string;
  value: string;
  delta: number;
  deltaSuffix?: string;
  isPP?: boolean;
  spark: { x: string; y: number }[];
  sparkColor: string;
}) {
  const positive = delta > 0.05;
  const negative = delta < -0.05;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const deltaColor = positive ? "text-ridge" : negative ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="relative bg-white border border-border rounded-xl shadow-sm p-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="pl-2 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
          <div className="text-2xl font-semibold text-abyss mt-1 tabular-nums">{value}</div>
          <div className={"flex items-center gap-1 text-xs font-medium mt-2 " + deltaColor}>
            <Icon className="h-3.5 w-3.5" />
            {Math.abs(delta).toFixed(1)}{isPP ? "pp" : deltaSuffix}
            <span className="text-muted-foreground font-normal ml-1">vs prior</span>
          </div>
        </div>
        <div className="w-24 h-12 shrink-0">
          <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Area type="monotone" dataKey="y" stroke={sparkColor} fill={sparkColor} fillOpacity={0.15} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CmpRow({
  label, curr, prev, formatter, isPP,
}: {
  label: string;
  curr: number;
  prev: number;
  formatter?: (n: number) => string;
  isPP?: boolean;
}) {
  const fmt = formatter ?? ((n: number) => (isPP ? pct(n) : n.toLocaleString("en-IN")));
  const delta = isPP ? curr - prev : deltaPct(curr, prev);
  const positive = delta > 0.05;
  const negative = delta < -0.05;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const deltaColor = positive ? "text-ridge" : negative ? "text-destructive" : "text-muted-foreground";
  return (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 text-abyss font-medium">{label}</td>
      <td className="py-2 text-right tabular-nums">{fmt(curr)}</td>
      <td className="py-2 text-right tabular-nums text-muted-foreground">{fmt(prev)}</td>
      <td className={"py-2 text-right tabular-nums font-medium " + deltaColor}>
        <span className="inline-flex items-center gap-0.5 justify-end">
          <Icon className="h-3 w-3" />
          {Math.abs(delta).toFixed(1)}{isPP ? "pp" : "%"}
        </span>
      </td>
    </tr>
  );
}

/* ───────── expense editor popover ───────── */
function ExpenseEditor({ month, onSaved }: { month: MonthlyRow; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(month.expenses || ""));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("monthly_expenses")
      .upsert(
        {
          month_year: month.monthKey,
          amount: Number(amount) || 0,
          notes: notes || null,
          created_by: user?.id ?? null,
        },
        { onConflict: "month_year" },
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Expenses for ${month.monthLabel} saved`);
    setOpen(false);
    onSaved();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-abyss" title="Edit expenses">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-abyss">Expenses for {month.monthLabel}</h4>
            <p className="text-xs text-muted-foreground">Operating expenses for net margin</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`amt-${month.monthKey}`} className="text-xs">Amount (₹)</Label>
            <Input
              id={`amt-${month.monthKey}`}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${month.monthKey}`} className="text-xs">Notes (optional)</Label>
            <Textarea
              id={`note-${month.monthKey}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ───────── skeleton ───────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><div className="h-9 w-64 bg-muted rounded-lg animate-pulse" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl shadow-sm p-5 h-28 animate-pulse" />
        ))}
      </div>
      <div className="bg-white border border-border rounded-xl shadow-sm p-5 h-[340px] animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white border border-border rounded-xl shadow-sm p-5 h-[480px] animate-pulse" />
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-border rounded-xl shadow-sm p-5 h-56 animate-pulse" />
          <div className="bg-white border border-border rounded-xl shadow-sm p-5 h-56 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl shadow-sm p-5 h-72 animate-pulse" />
        ))}
      </div>
    </div>
  );
}