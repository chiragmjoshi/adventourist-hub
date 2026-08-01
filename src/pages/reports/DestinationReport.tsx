import { useState, useEffect, useMemo } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import {
  calcTrip,
  DEFAULT_REPORT_FROM,
  DEFAULT_REPORT_TO,
  effectiveDate,
  fetchAll,
  fetchCashflowVendors,
  fetchCashflows,
  fetchLeads,
  inRange,
  isClosed,
  vendorCostMap,
} from "@/lib/reporting";

const DestinationReport = () => {
  const [from, setFrom] = useState(DEFAULT_REPORT_FROM);
  const [to, setTo] = useState(DEFAULT_REPORT_TO);
  const [leads, setLeads] = useState<any[]>([]);
  const [allCashflows, setAllCashflows] = useState<any[]>([]);
  const [cfVendors, setCfVendors] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [toggle, setToggle] = useState<"leads" | "revenue" | "margin">("leads");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      // trip_cashflow has no FK to destinations, so the name is joined client-side.
      const [l, d, cf] = await Promise.all([
        fetchLeads(from, to),
        fetchAll(() => supabase.from("destinations").select("id, name")),
        fetchCashflows(),
      ]);
      setLeads(l);
      setDestinations(d);
      setAllCashflows(cf);
      setCfVendors(await fetchCashflowVendors(cf.map((c: any) => c.id)));
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const destNameById = useMemo(() => {
    const map = new Map<string, string>();
    destinations.forEach((d: any) => map.set(d.id, d.name));
    return map;
  }, [destinations]);

  const cashflows = useMemo(
    () => allCashflows.filter((cf) => inRange(effectiveDate(cf), from, to)),
    [allCashflows, from, to]
  );

  const costByCf = useMemo(() => vendorCostMap(cfVendors), [cfVendors]);

  // Build destination table
  const destMap: Record<string, { name: string; leads: number; closed: number; revenue: number; margin: number }> = {};
  leads.forEach((l) => {
    const name = (l.destination_id ? destNameById.get(l.destination_id) : null) || "Unknown";
    if (!destMap[name]) destMap[name] = { name, leads: 0, closed: 0, revenue: 0, margin: 0 };
    destMap[name].leads++;
    if (isClosed(l)) destMap[name].closed++;
  });
  cashflows.forEach((cf) => {
    const name = (cf.destination_id ? destNameById.get(cf.destination_id) : null) || "Unknown";
    if (!destMap[name]) destMap[name] = { name, leads: 0, closed: 0, revenue: 0, margin: 0 };
    const t = calcTrip(cf, costByCf.get(cf.id) ?? 0);
    destMap[name].revenue += t.sellingExGst;
    destMap[name].margin += t.marginAmount;
  });
  const destData = Object.values(destMap).sort((a, b) => b.leads - a.leads);

  const chartData = [...destData].sort((a, b) => toggle === "leads" ? b.leads - a.leads : toggle === "revenue" ? b.revenue - a.revenue : (b.revenue > 0 ? b.margin / b.revenue : 0) - (a.revenue > 0 ? a.margin / a.revenue : 0)).slice(0, 10);

  const mostEnquired = destData[0]?.name || "—";
  const highestRev = [...destData].sort((a, b) => b.revenue - a.revenue)[0]?.name || "—";

  return (
    <AppLayout title="Destination Report">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Most Enquired</p><p className="text-lg font-bold mt-1 truncate">{mostEnquired}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Highest Revenue</p><p className="text-lg font-bold mt-1 truncate">{highestRev}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Destinations</p><p className="text-2xl font-bold mt-1">{destData.length}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-bold mt-1">{leads.length}</p></CardContent></Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top Destinations</CardTitle>
                <div className="flex gap-1">
                  {(["leads", "revenue", "margin"] as const).map((t) => (
                    <Button key={t} variant={toggle === t ? "default" : "outline"} size="sm" className="text-xs capitalize" onClick={() => setToggle(t)}>By {t}</Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 40)}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                  <Tooltip formatter={(v: number) => toggle === "revenue" ? formatINR(Math.round(v)) : toggle === "margin" ? `${((v) * 100).toFixed(1)}%` : v} />
                  <Bar dataKey={toggle === "margin" ? "margin" : toggle} fill="hsl(var(--lagoon))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Destination Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead><TableHead className="text-right">Leads</TableHead><TableHead className="text-right">Closed</TableHead><TableHead className="text-right">Conversion %</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destData.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-right">{d.leads}</TableCell>
                      <TableCell className="text-right">{d.closed}</TableCell>
                      <TableCell className="text-right">{d.leads > 0 ? ((d.closed / d.leads) * 100).toFixed(1) : 0}%</TableCell>
                      <TableCell className="text-right">{formatINR(Math.round(d.revenue))}</TableCell>
                      <TableCell className="text-right">{d.revenue > 0 ? ((d.margin / d.revenue) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

export default DestinationReport;
