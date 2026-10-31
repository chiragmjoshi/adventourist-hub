import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { BLAZE, HORIZON, LAGOON, RIDGE, ABYSS } from "@/lib/brandColors";
import { useFlag } from "@/hooks/useFlag";

/* ─────────────────────────────────────────────────────────────────────
   Phase E5 — Expenses report.
   Reads expense_entries (schema E1, backfilled from monthly_expenses in
   E4). Behind feature:expense_entries. Admin + super_admin only.
   ─────────────────────────────────────────────────────────────────── */

const CHART_COLORS = [BLAZE, HORIZON, LAGOON, RIDGE, ABYSS, "#7E3AF2", "#DC2626", "#059669", "#D97706", "#2563EB", "#6B7280", "#8B5CF6"];

type Entry = {
  id: string;
  entry_date: string;
  month_year: string;
  head: string;
  sub_head: string | null;
  amount: number;
  is_recurring: boolean;
  notes: string | null;
};

/** Indian FY: Apr 1 → Mar 31 */
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

const ExpensesReport = () => {
  const flagOn = useFlag("feature:expense_entries");

  const [from, setFrom] = useState<Date>(currentFyStart);
  const [to, setTo] = useState<Date>(currentFyEnd);
  const [headFilter, setHeadFilter] = useState<string>("all");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [heads, setHeads] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const fromKey = monthKey(from);
      const toKey = monthKey(to);
      const [entriesRes, headsRes] = await Promise.all([
        supabase
          .from("expense_entries" as never)
          .select("id, entry_date, month_year, head, sub_head, amount, is_recurring, notes")
          .gte("month_year", fromKey)
          .lte("month_year", toKey)
          .order("entry_date", { ascending: false }),
        supabase
          .from("master_values")
          .select("value")
          .eq("type", "expense_head")
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      setEntries((entriesRes.data as unknown as Entry[]) || []);
      setHeads((headsRes.data || []).map((h: { value: string }) => h.value));
      setLoading(false);
    })();
  }, [from, to]);

  const filtered = useMemo(() => {
    if (headFilter === "all") return entries;
    return entries.filter((e) => e.head === headFilter);
  }, [entries, headFilter]);

  const monthlyTotals = useMemo(() => {
    // Build month list spanning the filter window.
    const months: { key: string; label: string }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const stop = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= stop) {
      months.push({ key: monthKey(cursor), label: monthLabel(cursor) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const perMonth = new Map<string, number>();
    filtered.forEach((e) => {
      perMonth.set(e.month_year, (perMonth.get(e.month_year) ?? 0) + Number(e.amount));
    });
    return months.map((m) => ({ month: m.label, key: m.key, total: Math.round(perMonth.get(m.key) ?? 0) }));
  }, [filtered, from, to]);

  const stackedByHead = useMemo(() => {
    const months: { key: string; label: string }[] = [];
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const stop = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor <= stop) {
      months.push({ key: monthKey(cursor), label: monthLabel(cursor) });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const headsSeen = new Set<string>();
    const perMonthHead = new Map<string, Map<string, number>>();
    filtered.forEach((e) => {
      if (!perMonthHead.has(e.month_year)) perMonthHead.set(e.month_year, new Map());
      const bucket = perMonthHead.get(e.month_year)!;
      bucket.set(e.head, (bucket.get(e.head) ?? 0) + Number(e.amount));
      headsSeen.add(e.head);
    });
    const activeHeads = Array.from(headsSeen).sort();
    const data = months.map((m) => {
      const row: Record<string, string | number> = { month: m.label };
      const bucket = perMonthHead.get(m.key) ?? new Map();
      activeHeads.forEach((h) => { row[h] = Math.round(bucket.get(h) ?? 0); });
      return row;
    });
    return { data, headsInData: activeHeads };
  }, [filtered, from, to]);

  const topSubHeads = useMemo(() => {
    const bucket = new Map<string, { head: string; subHead: string; total: number }>();
    filtered.forEach((e) => {
      const key = `${e.head}|${e.sub_head ?? ""}`;
      const existing = bucket.get(key);
      const sub = e.sub_head ?? "—";
      if (existing) {
        existing.total += Number(e.amount);
      } else {
        bucket.set(key, { head: e.head, subHead: sub, total: Number(e.amount) });
      }
    });
    return Array.from(bucket.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtered]);

  const periodTotal = useMemo(
    () => filtered.reduce((s, e) => s + Number(e.amount), 0),
    [filtered]
  );
  const avgPerMonth = useMemo(() => {
    const nonZero = monthlyTotals.filter((m) => m.total > 0).length;
    return nonZero > 0 ? periodTotal / nonZero : 0;
  }, [periodTotal, monthlyTotals]);

  const exportCSV = () => {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = ["Date,Head,Sub-head,Amount,Recurring,Notes"];
    filtered.forEach((e) => {
      lines.push([
        e.entry_date,
        e.head,
        e.sub_head ?? "",
        Math.round(Number(e.amount)),
        e.is_recurring ? "Yes" : "No",
        e.notes ?? "",
      ].map(esc).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!flagOn) {
    return (
      <AppLayout title="Expenses Report">
        <Card className="border shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            This report is behind the <code>feature:expense_entries</code> flag. Enable it from Settings → Features to view the operating-expense breakdown.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Expenses Report">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <Select value={headFilter} onValueChange={setHeadFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All heads" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All heads</SelectItem>
              {heads.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={loading || filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total in period</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{formatINR(Math.round(periodTotal))}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg per active month</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{formatINR(Math.round(avgPerMonth))}</p>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Entries</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{filtered.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly expenses</CardTitle></CardHeader>
            <CardContent>
              {monthlyTotals.every((m) => m.total === 0) ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No expense data in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={monthlyTotals}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1e5).toFixed(1)}L`} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Line type="monotone" dataKey="total" stroke={BLAZE} strokeWidth={2} dot={{ r: 3 }} name="Total" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Monthly breakdown by head</CardTitle></CardHeader>
            <CardContent>
              {stackedByHead.headsInData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No head-level breakdown available in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stackedByHead.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1e5).toFixed(1)}L`} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {stackedByHead.headsInData.map((h, i) => (
                      <Bar key={h} dataKey={h} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} radius={i === stackedByHead.headsInData.length - 1 ? [4, 4, 0, 0] : 0} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 sub-heads</CardTitle></CardHeader>
              <CardContent>
                {topSubHeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No sub-head data.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-head</TableHead>
                        <TableHead>Head</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topSubHeads.map((r) => (
                        <TableRow key={`${r.head}-${r.subHead}`}>
                          <TableCell className="font-medium">{r.subHead}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{r.head}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(Math.round(r.total))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">By head · totals</CardTitle></CardHeader>
              <CardContent>
                {stackedByHead.headsInData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No head totals.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Head</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">% of period</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const totals = new Map<string, number>();
                        filtered.forEach((e) => totals.set(e.head, (totals.get(e.head) ?? 0) + Number(e.amount)));
                        return Array.from(totals.entries())
                          .sort((a, b) => b[1] - a[1])
                          .map(([head, total]) => (
                            <TableRow key={head}>
                              <TableCell className="font-medium">{head}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatINR(Math.round(total))}</TableCell>
                              <TableCell className="text-right tabular-nums text-muted-foreground">
                                {periodTotal > 0 ? ((total / periodTotal) * 100).toFixed(1) + "%" : "—"}
                              </TableCell>
                            </TableRow>
                          ));
                      })()}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">All entries</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filtered.length} rows · {format(from, "d MMM yy")} – {format(to, "d MMM yy")}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No entries for this filter.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Head</TableHead>
                      <TableHead>Sub-head</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(e.entry_date), "d MMM yy")}
                        </TableCell>
                        <TableCell className="font-medium">{e.head}</TableCell>
                        <TableCell className="text-xs">{e.sub_head || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatINR(Math.round(Number(e.amount)))}
                        </TableCell>
                        <TableCell>
                          {e.is_recurring && (
                            <Badge variant="outline" className="text-[10px]">Recurring</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={e.notes ?? ""}>
                          {e.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

export default ExpensesReport;
