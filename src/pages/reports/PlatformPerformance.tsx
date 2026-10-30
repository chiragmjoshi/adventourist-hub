import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, Info } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { displayPlatform } from "@/lib/formatLabel";
import { BLAZE, HORIZON, LAGOON, RIDGE, ABYSS } from "@/lib/brandColors";
import { useFlag } from "@/hooks/useFlag";
import { useMarketingSpends } from "@/hooks/useMarketingSpends";
import {
  calcTrip, effectiveDate, endOfSelectedDay,
  fetchCashflows, fetchCashflowVendors, inRange, isClosed, vendorCostMap,
} from "@/lib/reporting";

/* ────────────────────────────────────────────────────────────────────────
   Phase M6 — Platform Performance report.
   Different from Platform ROI (/admin/reports/roi): this one is a
   dedicated per-platform breakdown with CSV export and a trend view,
   suitable for a monthly cadence or an export to the ad platform.
   Behind feature:marketing_spend. Admin + super_admin only.
   ──────────────────────────────────────────────────────────────────────── */

const LINE_COLORS = [BLAZE, HORIZON, LAGOON, RIDGE, ABYSS, "#7E3AF2", "#DC2626"];

type Lead = {
  id: string;
  platform: string | null;
  destination_id: string | null;
  sales_status: string | null;
  disposition: string | null;
  created_at: string;
  traveller_code: string | null;
};

type Cashflow = {
  id: string;
  lead_id: string | null;
  traveller_code: string | null;
  pax_count: number | null;
  margin_percent: number | null;
  gst_billing: boolean | null;
  booking_date: string | null;
  travel_start_date: string | null;
  created_at: string;
  destination_id: string | null;
};

type Row = {
  platform: string;
  spend: number;
  leads: number;
  closed: number;
  revenue: number;
  vendorCost: number;
  grossMargin: number;
  topDestinations: string[];
};

/* Default: current calendar month. The ROI report defaults to the full
   data range; this one is monthly on purpose because the report is
   designed to be exported per month. */
const defaultFrom = () => startOfMonth(new Date());
const defaultTo = () => endOfMonth(new Date());

const PlatformPerformance = () => {
  const marketingSpendOn = useFlag("feature:marketing_spend");
  const [from, setFrom] = useState<Date>(defaultFrom);
  const [to, setTo] = useState<Date>(defaultTo);
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);
  const [costByCf, setCostByCf] = useState<Map<string, number>>(new Map());
  const [destinationNames, setDestinationNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const spendsQuery = useMarketingSpends();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [leadsRes, cfRes, destsRes] = await Promise.all([
        supabase
          .from("leads")
          .select("id, platform, destination_id, sales_status, disposition, created_at, traveller_code"),
        fetchCashflows(
          "id, lead_id, traveller_code, pax_count, margin_percent, gst_billing, booking_date, travel_start_date, created_at, destination_id"
        ) as Promise<Cashflow[]>,
        supabase.from("destinations").select("id, name"),
      ]);
      const cashflowRows = cfRes;
      const vendors = await fetchCashflowVendors(
        cashflowRows.map((c) => c.id),
        "cashflow_id, cost_per_pax_incl_gst"
      );
      setLeads((leadsRes.data as unknown as Lead[]) || []);
      setCashflows(cashflowRows);
      setCostByCf(vendorCostMap(vendors as unknown as { cashflow_id: string; cost_per_pax_incl_gst: number | string | null }[]));
      const map = new Map<string, string>();
      (destsRes.data || []).forEach((d: { id: string; name: string }) => map.set(d.id, d.name));
      setDestinationNames(map);
      setLoading(false);
    })();
  }, []);

  /* Attribution: lead_id first, then traveller_code (same fallback as
     PlatformROI/LandingPageList — only ~7 of ~210 trips carry lead_id). */
  const leadById = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => m.set(l.id, l));
    return m;
  }, [leads]);
  const leadByTravellerCode = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => { if (l.traveller_code && !m.has(l.traveller_code)) m.set(l.traveller_code, l); });
    return m;
  }, [leads]);

  /* Per-platform rollup for the chosen filter window. */
  const rows: Row[] = useMemo(() => {
    const map = new Map<string, Row>();
    const destCountByPlatform = new Map<string, Map<string, number>>();
    const bucket = (key: string): Row => {
      let r = map.get(key);
      if (!r) {
        r = { platform: key, spend: 0, leads: 0, closed: 0, revenue: 0, vendorCost: 0, grossMargin: 0, topDestinations: [] };
        map.set(key, r);
      }
      return r;
    };

    const fromMs = from.getTime();
    const toMs = endOfSelectedDay(to).getTime();

    // Leads
    leads.forEach((l) => {
      const createdMs = new Date(l.created_at).getTime();
      if (createdMs < fromMs || createdMs > toMs) return;
      const key = displayPlatform(l.platform);
      const row = bucket(key);
      row.leads += 1;
      if (isClosed(l)) {
        row.closed += 1;
        if (l.destination_id) {
          const name = destinationNames.get(l.destination_id);
          if (name) {
            let perPlat = destCountByPlatform.get(key);
            if (!perPlat) { perPlat = new Map(); destCountByPlatform.set(key, perPlat); }
            perPlat.set(name, (perPlat.get(name) ?? 0) + 1);
          }
        }
      }
    });

    // Revenue + vendor cost
    cashflows.forEach((cf) => {
      if (!inRange(effectiveDate(cf), from, to)) return;
      const lead =
        (cf.lead_id ? leadById.get(cf.lead_id) : null) ||
        (cf.traveller_code ? leadByTravellerCode.get(cf.traveller_code) : null);
      const key = lead ? displayPlatform(lead.platform) : "Unattributed";
      const row = bucket(key);
      const trip = calcTrip(cf, costByCf.get(cf.id) ?? 0);
      row.revenue += trip.sellingExGst;
      row.vendorCost += trip.totalVendorCost;
    });

    // Spend (prorated to filter window)
    (spendsQuery.data || []).forEach((s) => {
      const rs = new Date(s.start_date).getTime();
      const re = new Date(s.end_date).getTime();
      const span = Math.floor((re - rs) / 86_400_000) + 1;
      if (span <= 0) return;
      const os = Math.max(rs, fromMs);
      const oe = Math.min(re, toMs);
      const overlap = Math.floor((oe - os) / 86_400_000) + 1;
      if (overlap <= 0) return;
      const key = displayPlatform(s.platform);
      bucket(key).spend += Number(s.amount) * (overlap / span);
    });

    // Finalise: gross margin + top destinations
    map.forEach((r, k) => {
      r.grossMargin = r.revenue - r.vendorCost;
      const destMap = destCountByPlatform.get(k);
      if (destMap) {
        r.topDestinations = [...destMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);
      }
    });

    const all = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.spend - a.spend);
    return platformFilter === "all" ? all : all.filter((r) => r.platform === platformFilter);
  }, [leads, cashflows, costByCf, spendsQuery.data, destinationNames, from, to, platformFilter, leadById, leadByTravellerCode]);

  const platformOptions = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => set.add(displayPlatform(l.platform)));
    (spendsQuery.data || []).forEach((s) => set.add(displayPlatform(s.platform)));
    return Array.from(set).sort();
  }, [leads, spendsQuery.data]);

  /* ─── CPL trend chart data (last 6 months). ─── */
  const trendData = useMemo(() => {
    if (!spendsQuery.data || spendsQuery.data.length === 0) return { data: [], keys: [] as string[] };
    const months = Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i);
      return { start: startOfMonth(m), end: endOfMonth(m), label: format(m, "MMM yy") };
    });
    const platformsWithSpend = new Set<string>();
    (spendsQuery.data || []).forEach((s) => platformsWithSpend.add(displayPlatform(s.platform)));

    const data = months.map(({ start, end, label }) => {
      const row: Record<string, string | number> = { month: label };
      platformsWithSpend.forEach((plat) => {
        let monthSpend = 0;
        (spendsQuery.data || []).forEach((s) => {
          if (displayPlatform(s.platform) !== plat) return;
          const rs = new Date(s.start_date).getTime();
          const re = new Date(s.end_date).getTime();
          const span = Math.floor((re - rs) / 86_400_000) + 1;
          if (span <= 0) return;
          const os = Math.max(rs, start.getTime());
          const oe = Math.min(re, end.getTime());
          const overlap = Math.floor((oe - os) / 86_400_000) + 1;
          if (overlap > 0) monthSpend += Number(s.amount) * (overlap / span);
        });
        const monthLeads = leads.filter((l) => {
          if (displayPlatform(l.platform) !== plat) return false;
          const c = new Date(l.created_at);
          return c >= start && c <= end;
        }).length;
        row[plat] = monthLeads > 0 && monthSpend > 0 ? Math.round(monthSpend / monthLeads) : 0;
      });
      return row;
    });
    return { data, keys: Array.from(platformsWithSpend) };
  }, [spendsQuery.data, leads]);

  /* ─── CSV export. ─── */
  const exportCSV = () => {
    const headers = [
      "Platform", "Spend", "Leads", "CPL", "Closed", "Conversion %",
      "Ticket Size", "Revenue", "Vendor Cost", "Gross Margin", "Margin %", "Top 3 Destinations",
    ];
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      const cpl = r.leads > 0 && r.spend > 0 ? Math.round(r.spend / r.leads) : "";
      const conv = r.leads > 0 ? ((r.closed / r.leads) * 100).toFixed(1) : "";
      const ticket = r.closed > 0 ? Math.round(r.revenue / r.closed) : "";
      const marginPct = r.revenue > 0 ? ((r.grossMargin / r.revenue) * 100).toFixed(1) : "";
      lines.push([
        r.platform,
        Math.round(r.spend),
        r.leads,
        cpl,
        r.closed,
        conv,
        ticket,
        Math.round(r.revenue),
        Math.round(r.vendorCost),
        Math.round(r.grossMargin),
        marginPct,
        r.topDestinations.join(" · "),
      ].map(esc).join(","));
    });
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `platform-performance-${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!marketingSpendOn) {
    return (
      <AppLayout title="Platform Performance">
        <Card className="border shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">
            This report is behind the <code>feature:marketing_spend</code> flag. Enable it from Settings → Features to view platform-level spend, CPL, CAC, ROAS and the top-destinations breakdown.
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const totalSpend = rows.reduce((s, r) => s + r.spend, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalClosed = rows.reduce((s, r) => s + r.closed, 0);

  return (
    <AppLayout title="Platform Performance">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SelectValue placeholder="All platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Spend</p><p className="text-2xl font-bold mt-1 tabular-nums">{formatINR(Math.round(totalSpend))}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Leads</p><p className="text-2xl font-bold mt-1 tabular-nums">{totalLeads}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Closed</p><p className="text-2xl font-bold mt-1 tabular-nums">{totalClosed}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold mt-1 tabular-nums">{formatINR(Math.round(totalRevenue))}</p></CardContent></Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2 flex-row justify-between items-center">
              <CardTitle className="text-base">Per-platform breakdown</CardTitle>
              {rows.some((r) => r.platform === "Unattributed" && r.revenue > 0) && (
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Revenue from unlinked cashflows shown in <strong className="font-medium">Unattributed</strong>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No data for this period.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">CPL</TableHead>
                      <TableHead className="text-right">Closed</TableHead>
                      <TableHead className="text-right">Conv %</TableHead>
                      <TableHead className="text-right">Ticket Size</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Gross Margin</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                      <TableHead>Top 3 Destinations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => {
                      const cpl = r.leads > 0 && r.spend > 0 ? Math.round(r.spend / r.leads) : null;
                      const conv = r.leads > 0 ? ((r.closed / r.leads) * 100).toFixed(1) : null;
                      const ticket = r.closed > 0 ? Math.round(r.revenue / r.closed) : null;
                      const marginPct = r.revenue > 0 ? ((r.grossMargin / r.revenue) * 100).toFixed(1) : null;
                      return (
                        <TableRow key={r.platform}>
                          <TableCell className="font-medium">{r.platform}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.spend > 0 ? formatINR(Math.round(r.spend)) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.leads}</TableCell>
                          <TableCell className="text-right tabular-nums">{cpl !== null ? formatINR(cpl) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.closed}</TableCell>
                          <TableCell className="text-right tabular-nums">{conv !== null ? `${conv}%` : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{ticket !== null ? formatINR(ticket) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(Math.round(r.revenue))}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatINR(Math.round(r.grossMargin))}</TableCell>
                          <TableCell className={"text-right tabular-nums " + (r.grossMargin < 0 ? "text-destructive" : "")}>
                            {marginPct !== null ? `${marginPct}%` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.topDestinations.length > 0 ? r.topDestinations.join(" · ") : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Spend vs Revenue by Platform</CardTitle></CardHeader>
            <CardContent>
              {rows.filter((r) => r.spend > 0 || r.revenue > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No spend or revenue for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={rows.filter((r) => r.spend > 0 || r.revenue > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                    <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1e5).toFixed(0)}L`} />
                    <Tooltip formatter={(v: number) => formatINR(Math.round(v))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="spend" fill={HORIZON} name="Spend" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="revenue" fill={BLAZE} name="Revenue" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">CPL trend — last 6 months</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Always the last 6 calendar months — not affected by the date filter above.
              </p>
            </CardHeader>
            <CardContent>
              {trendData.keys.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No spend logged in the last 6 months.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatINR(v)} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {trendData.keys.map((k, i) => (
                      <Line key={k} type="monotone" dataKey={k} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

export default PlatformPerformance;
