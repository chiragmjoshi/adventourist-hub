import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { BLAZE, HORIZON, LAGOON, RIDGE, DRIFT } from "@/lib/brandColors";
import { useFlag } from "@/hooks/useFlag";
import { useMarketingSpends } from "@/hooks/useMarketingSpends";
import {
  calcTrip, effectiveDate, fetchCashflows, fetchCashflowVendors, vendorCostMap,
} from "@/lib/reporting";

/* ─────────────────────────────────────────────────────────────────────
   Phase E6 — Combined P&L report.
   Composite view across three sources:
     Revenue, Vendor Cost     ← trip_cashflow + trip_cashflow_vendors
     Marketing Spend          ← marketing_spends (prorated to month)
     Operating Expenses       ← expense_entries (summed by month_year)
   Net Profit = GM − Marketing − Operating.
   Behind feature:marketing_spend AND feature:expense_entries. Admin +
   super_admin only. CSV export only; PDF not needed since this is an
   internal view, not an external hand-off.
   ─────────────────────────────────────────────────────────────────── */

const currentFyStart = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return new Date(year, 3, 1);
};
const currentFyEnd = () => {
  const start = currentFyStart();
  return new Date(start.getFullYear() + 1, 2, 31);
};

const monthKey = (d: Date) => format(d, "yyyy-MM");
const monthLabel = (d: Date) => format(d, "MMM yy");

type Cashflow = {
  id: string;
  pax_count: number | null;
  margin_percent: number | null;
  gst_billing: boolean | null;
  booking_date: string | null;
  travel_start_date: string | null;
  created_at: string;
};

type ExpenseLite = { month_year: string; amount: number };

type MonthRow = {
  monthKey: string;
  label: string;
  revenue: number;
  vendorCost: number;
  grossMargin: number;
  marketingSpend: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPct: number | null;
};

const PnlReport = () => {
  const marketingOn = useFlag("feature:marketing_spend");
  const expensesOn = useFlag("feature:expense_entries");
  const bothOn = marketingOn && expensesOn;

  const [from, setFrom] = useState<Date>(currentFyStart);
  const [to, setTo] = useState<Date>(currentFyEnd);

  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [costByCf, setCostByCf] = useState<Map<string, number>>(new Map());
  const [expensesByMonth, setExpensesByMonth] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  const spendsQuery = useMarketingSpends();

  useEffect(() => {
    if (!bothOn) return;
    (async () => {
      setLoading(true);
      const fromKey = monthKey(from);
      const toKey = monthKey(to);
      const [cfRes, expensesRes] = await Promise.all([
        fetchCashflows(
          "id, pax_count, margin_percent, gst_billing, booking_date, travel_start_date, created_at"
        ) as Promise<Cashflow[]>,
        supabase
          .from("expense_entries" as never)
          .select("month_year, amount")
          .gte("month_year", fromKey)
          .lte("month_year", toKey),
      ]);
      const vendors = await fetchCashflowVendors(
        cfRes.map((c) => c.id),
        "cashflow_id, cost_per_pax_incl_gst"
      );
      setCashflows(cfRes);
      setCostByCf(vendorCostMap(vendors as unknown as { cashflow_id: string; cost_per_pax_incl_gst: number | string | null }[]));
      const em = new Map<string, number>();
      ((expensesRes.data as unknown as ExpenseLite[]) || []).forEach((e) => {
        em.set(e.month_year, (em.get(e.month_year) ?? 0) + Number(e.amount));
      });
      setExpensesByMonth(em);
      setLoading(false);
    })();
  }, [bothOn, from, to]);

  const rows: MonthRow[] = useMemo(() => {
    if (!bothOn) return [];
    const months: { key: string; label: string; start: Date; end: Date }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const stop = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= stop) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      months.push({ key: monthKey(cursor), label: monthLabel(cursor), start, end });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months.map(({ key, label, start, end }) => {
      // Revenue + vendor cost from cashflows whose effective_date lands in this month.
      let revenue = 0;
      let vendorCost = 0;
      cashflows.forEach((cf) => {
        const d = effectiveDate(cf);
        if (!d) return;
        if (d < start || d > end) return;
        const trip = calcTrip(cf, costByCf.get(cf.id) ?? 0);
        revenue += trip.sellingExGst;
        vendorCost += trip.totalVendorCost;
      });

      // Marketing spend prorated to this month.
      let marketingSpend = 0;
      (spendsQuery.data || []).forEach((s) => {
        const rs = new Date(s.start_date).getTime();
        const re = new Date(s.end_date).getTime();
        const span = Math.floor((re - rs) / 86_400_000) + 1;
        if (span <= 0) return;
        const os = Math.max(rs, start.getTime());
        const oe = Math.min(re, end.getTime());
        const overlap = Math.floor((oe - os) / 86_400_000) + 1;
        if (overlap <= 0) return;
        marketingSpend += Number(s.amount) * (overlap / span);
      });

      const operatingExpenses = expensesByMonth.get(key) ?? 0;
      const grossMargin = revenue - vendorCost;
      const netProfit = grossMargin - marketingSpend - operatingExpenses;

      return {
        monthKey: key,
        label,
        revenue,
        vendorCost,
        grossMargin,
        marketingSpend,
        operatingExpenses,
        netProfit,
        netMarginPct: revenue > 0 ? (netProfit / revenue) * 100 : null,
      };
    });
  }, [bothOn, cashflows, costByCf, spendsQuery.data, expensesByMonth, from, to]);

  const totals = useMemo(() => {
    const t = rows.reduce(
      (acc, r) => ({
        revenue: acc.revenue + r.revenue,
        vendorCost: acc.vendorCost + r.vendorCost,
        grossMargin: acc.grossMargin + r.grossMargin,
        marketingSpend: acc.marketingSpend + r.marketingSpend,
        operatingExpenses: acc.operatingExpenses + r.operatingExpenses,
        netProfit: acc.netProfit + r.netProfit,
      }),
      { revenue: 0, vendorCost: 0, grossMargin: 0, marketingSpend: 0, operatingExpenses: 0, netProfit: 0 }
    );
    return { ...t, netMarginPct: t.revenue > 0 ? (t.netProfit / t.revenue) * 100 : null };
  }, [rows]);

  const exportCSV = () => {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = ["Month,Revenue,Vendor Cost,Gross Margin,Marketing Spend,Operating Expenses,Net Profit,Net Margin %"];
    rows.forEach((r) => {
      lines.push([
        r.label,
        Math.round(r.revenue),
        Math.round(r.vendorCost),
        Math.round(r.grossMargin),
        Math.round(r.marketingSpend),
        Math.round(r.operatingExpenses),
        Math.round(r.netProfit),
        r.netMarginPct !== null ? r.netMarginPct.toFixed(1) : "",
      ].map(esc).join(","));
    });
    lines.push([
      "TOTAL",
      Math.round(totals.revenue),
      Math.round(totals.vendorCost),
      Math.round(totals.grossMargin),
      Math.round(totals.marketingSpend),
      Math.round(totals.operatingExpenses),
      Math.round(totals.netProfit),
      totals.netMarginPct !== null ? totals.netMarginPct.toFixed(1) : "",
    ].map(esc).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!bothOn) {
    return (
      <AppLayout title="Combined P&L">
        <Card className="border shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
            <p>This report pulls from both marketing-spend and operating-expense sources. Enable both from Settings → Features:</p>
            <ul className="list-disc list-inside">
              <li><code>feature:marketing_spend</code> — {marketingOn ? "✓ enabled" : "✗ disabled"}</li>
              <li><code>feature:expense_entries</code> — {expensesOn ? "✓ enabled" : "✗ disabled"}</li>
            </ul>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Combined P&L">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KpiCard label="Revenue" value={formatINR(Math.round(totals.revenue))} />
            <KpiCard label="Gross Margin" value={formatINR(Math.round(totals.grossMargin))} tone="good" />
            <KpiCard
              label="Net Profit"
              value={formatINR(Math.round(totals.netProfit))}
              tone={totals.netProfit >= 0 ? "good" : "bad"}
            />
            <KpiCard
              label="Net Margin %"
              value={totals.netMarginPct !== null ? `${totals.netMarginPct.toFixed(1)}%` : "—"}
              tone={totals.netMarginPct !== null && totals.netMarginPct < 0 ? "bad" : "good"}
            />
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly P&L stack</CardTitle></CardHeader>
            <CardContent>
              {rows.every((r) => r.revenue === 0 && r.marketingSpend === 0 && r.operatingExpenses === 0) ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No activity in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1e5).toFixed(0)}L`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                    <Tooltip
                      formatter={(v: number, name: string) => {
                        if (name === "Net Margin %") return [`${v.toFixed(1)}%`, name];
                        return [formatINR(Math.round(v)), name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left" dataKey="vendorCost" stackId="costs" name="Vendor Cost" fill={DRIFT} />
                    <Bar yAxisId="left" dataKey="marketingSpend" stackId="costs" name="Marketing Spend" fill={HORIZON} />
                    <Bar yAxisId="left" dataKey="operatingExpenses" stackId="costs" name="Operating Expenses" fill={LAGOON} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill={BLAZE} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="netMarginPct" name="Net Margin %" stroke={RIDGE} strokeWidth={2.5} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Vendor Cost</TableHead>
                    <TableHead className="text-right">Gross Margin</TableHead>
                    <TableHead className="text-right">Marketing Spend</TableHead>
                    <TableHead className="text-right">Operating Expenses</TableHead>
                    <TableHead className="text-right">Net Profit</TableHead>
                    <TableHead className="text-right">Net Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.monthKey}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(Math.round(r.revenue))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(Math.round(r.vendorCost))}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(Math.round(r.grossMargin))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(Math.round(r.marketingSpend))}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{formatINR(Math.round(r.operatingExpenses))}</TableCell>
                      <TableCell className={"text-right tabular-nums font-medium " + (r.netProfit < 0 ? "text-destructive" : r.netProfit > 0 ? "text-[hsl(var(--ridge))]" : "")}>
                        {formatINR(Math.round(r.netProfit))}
                      </TableCell>
                      <TableCell className={"text-right tabular-nums " + (r.netMarginPct !== null && r.netMarginPct < 0 ? "text-destructive" : "")}>
                        {r.netMarginPct !== null ? `${r.netMarginPct.toFixed(1)}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 border-t-2">
                    <TableCell className="font-bold">TOTAL</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{formatINR(Math.round(totals.revenue))}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{formatINR(Math.round(totals.vendorCost))}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{formatINR(Math.round(totals.grossMargin))}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{formatINR(Math.round(totals.marketingSpend))}</TableCell>
                    <TableCell className="text-right tabular-nums font-bold">{formatINR(Math.round(totals.operatingExpenses))}</TableCell>
                    <TableCell className={"text-right tabular-nums font-bold " + (totals.netProfit < 0 ? "text-destructive" : "text-[hsl(var(--ridge))]")}>
                      {formatINR(Math.round(totals.netProfit))}
                    </TableCell>
                    <TableCell className={"text-right tabular-nums font-bold " + (totals.netMarginPct !== null && totals.netMarginPct < 0 ? "text-destructive" : "")}>
                      {totals.netMarginPct !== null ? `${totals.netMarginPct.toFixed(1)}%` : "—"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

/* ───────── sub-component ───────── */
function KpiCard({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color =
    tone === "good" ? "text-[hsl(var(--ridge))]" :
    tone === "bad"  ? "text-destructive" :
    "text-foreground";
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default PnlReport;
