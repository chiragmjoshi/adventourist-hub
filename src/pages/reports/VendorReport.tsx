import { useState, useEffect, useMemo } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const VendorReport = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [cashflows, setCashflows] = useState<any[]>([]);
  const [cfVendors, setCfVendors] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: cf } = await supabase
        .from("trip_cashflow")
        .select("id, status, travel_start_date, pax_count, destination_id")
        .gte("travel_start_date", from.toISOString().split("T")[0])
        .lte("travel_start_date", to.toISOString().split("T")[0]);
      setCashflows(cf || []);

      const cfIds = (cf || []).map((c: any) => c.id);
      let cv: any[] = [];
      if (cfIds.length > 0) {
        const { data } = await supabase
          .from("trip_cashflow_vendors")
          .select("*")
          .in("cashflow_id", cfIds);
        cv = data || [];
      }
      setCfVendors(cv);

      const { data: v } = await supabase
        .from("vendors")
        .select("id, name, nick_name, services, is_active");
      setVendors(v || []);
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const cfById = useMemo(() => {
    const map: Record<string, any> = {};
    cashflows.forEach((cf) => { map[cf.id] = cf; });
    return map;
  }, [cashflows]);

  const vendorById = useMemo(() => {
    const map: Record<string, any> = {};
    vendors.forEach((v) => { map[v.id] = v; });
    return map;
  }, [vendors]);

  // Aggregate per vendor
  const vendorAgg = useMemo(() => {
    const agg: Record<string, {
      id: string; name: string; category: string; isActive: boolean;
      trips: Set<string>; totalCost: number; totalPax: number;
    }> = {};
    cfVendors.forEach((cv) => {
      const v = vendorById[cv.vendor_id];
      if (!v) return;
      const cf = cfById[cv.cashflow_id];
      if (!cf) return;
      const pax = cf.pax_count || 1;
      const cost = Number(cv.cost_per_pax_incl_gst || 0) * pax;
      if (!agg[v.id]) {
        agg[v.id] = {
          id: v.id, name: v.name,
          category: Array.isArray(v.services) && v.services.length > 0 ? v.services[0] : "—",
          isActive: !!v.is_active,
          trips: new Set(), totalCost: 0, totalPax: 0,
        };
      }
      agg[v.id].trips.add(cv.cashflow_id);
      agg[v.id].totalCost += cost;
      agg[v.id].totalPax += pax;
    });
    return Object.values(agg)
      .map((a) => ({
        ...a,
        tripCount: a.trips.size,
        avgPerTrip: a.trips.size > 0 ? a.totalCost / a.trips.size : 0,
        avgPerPax: a.totalPax > 0 ? a.totalCost / a.totalPax : 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost);
  }, [cfVendors, vendorById, cfById]);

  const totalVendorsUsed = vendorAgg.length;
  const totalVendorCost = vendorAgg.reduce((s, v) => s + v.totalCost, 0);
  const totalPax = vendorAgg.reduce((s, v) => s + v.totalPax, 0);
  const avgCostPerPax = totalPax > 0 ? totalVendorCost / totalPax : 0;
  const mostUsed = [...vendorAgg].sort((a, b) => b.tripCount - a.tripCount)[0]?.name || "—";

  const top10 = vendorAgg.slice(0, 10).map((v) => ({ name: v.name, cost: Math.round(v.totalCost) }));

  return (
    <AppLayout title="Vendor Performance Report">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Vendors Used</p><p className="text-2xl font-bold mt-1">{totalVendorsUsed}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Vendor Cost</p><p className="text-2xl font-bold mt-1">{formatINR(Math.round(totalVendorCost))}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Most Used Vendor</p><p className="text-lg font-bold mt-1 truncate">{mostUsed}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Cost / Pax</p><p className="text-2xl font-bold mt-1">{formatINR(Math.round(avgCostPerPax))}</p></CardContent></Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 Vendors by Total Cost</CardTitle></CardHeader>
            <CardContent>
              {top10.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No vendor data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, top10.length * 40)}>
                  <BarChart data={top10} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="cost" fill="hsl(var(--blaze))" radius={[0, 4, 4, 0]} name="Total Cost" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Vendor Breakdown</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Trips</TableHead>
                    <TableHead className="text-right">Total Pax</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead className="text-right">Avg / Trip</TableHead>
                    <TableHead className="text-right">Avg / Pax</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorAgg.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No vendor data for this period</TableCell></TableRow>
                  ) : vendorAgg.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell>{v.category}</TableCell>
                      <TableCell className="text-right">{v.tripCount}</TableCell>
                      <TableCell className="text-right">{v.totalPax}</TableCell>
                      <TableCell className="text-right">{formatINR(Math.round(v.totalCost))}</TableCell>
                      <TableCell className="text-right">{formatINR(Math.round(v.avgPerTrip))}</TableCell>
                      <TableCell className="text-right">{formatINR(Math.round(v.avgPerPax))}</TableCell>
                      <TableCell>
                        {v.isActive
                          ? <Badge className="bg-[hsl(var(--ridge))] text-white border-0">Active</Badge>
                          : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
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

export default VendorReport;
