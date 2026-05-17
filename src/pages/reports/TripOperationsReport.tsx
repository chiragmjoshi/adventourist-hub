import { useEffect, useMemo, useState } from "react";
import { addDays, endOfMonth, format, startOfMonth, subMonths, addMonths } from "date-fns";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const TripOperationsReport = () => {
  const [cashflows, setCashflows] = useState<any[]>([]);
  const [cfVendors, setCfVendors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const { data: cf } = await supabase
        .from("trip_cashflow")
        .select("*, destination:destinations(name), lead:leads(name, mobile)")
        .gte("travel_start_date", today)
        .order("travel_start_date", { ascending: true });
      setCashflows(cf || []);

      const cfIds = (cf || []).map((c: any) => c.id);
      if (cfIds.length > 0) {
        const { data: v } = await supabase
          .from("trip_cashflow_vendors")
          .select("cashflow_id, cost_per_pax_incl_gst")
          .in("cashflow_id", cfIds);
        setCfVendors(v || []);
      }

      const { data: u } = await supabase.from("users").select("id, name");
      setUsers(u || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const userById = useMemo(() => {
    const map: Record<string, string> = {};
    users.forEach((u) => { map[u.id] = u.name; });
    return map;
  }, [users]);

  const vendorCostByCf = useMemo(() => {
    const map: Record<string, number> = {};
    cfVendors.forEach((v) => {
      map[v.cashflow_id] = (map[v.cashflow_id] || 0) + Number(v.cost_per_pax_incl_gst || 0);
    });
    return map;
  }, [cfVendors]);

  const calcSelling = (cf: any) => {
    const vc = (vendorCostByCf[cf.id] || 0) * (cf.pax_count || 1);
    const mp = Number(cf.margin_percent || 0);
    return vc + vc * (mp / 100);
  };

  const today = new Date();
  const in30 = addDays(today, 30);
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const upcoming30 = cashflows.filter((cf) => {
    if (!cf.travel_start_date) return false;
    const d = new Date(cf.travel_start_date);
    return d >= today && d <= in30;
  }).length;

  const thisMonth = cashflows.filter((cf) => {
    if (!cf.travel_start_date) return false;
    const d = new Date(cf.travel_start_date);
    return d >= monthStart && d <= monthEnd;
  }).length;

  const confirmed = cashflows.filter((cf) => ["confirmed", "completed"].includes(cf.status)).length;
  const pending = cashflows.filter((cf) => ["draft", "in_progress"].includes(cf.status)).length;

  // Departures by month (next 6 months)
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const m = addMonths(today, i);
    const mStr = format(m, "yyyy-MM");
    const count = cashflows.filter((cf) => cf.travel_start_date && format(new Date(cf.travel_start_date), "yyyy-MM") === mStr).length;
    return { month: format(m, "MMM yy"), count };
  });

  const departureColor = (dateStr: string) => {
    if (!dateStr) return "text-muted-foreground";
    const d = new Date(dateStr);
    const days = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return "text-red-600 font-semibold";
    if (days <= 30) return "text-amber-600 font-medium";
    return "text-[hsl(var(--ridge))]";
  };

  return (
    <AppLayout title="Trip Operations Report">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">All upcoming trips with travel start date ≥ today</p>
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Upcoming (30 days)</p><p className="text-2xl font-bold mt-1">{upcoming30}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">This Month Departures</p><p className="text-2xl font-bold mt-1">{thisMonth}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Confirmed Trips</p><p className="text-2xl font-bold mt-1">{confirmed}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Confirmation</p><p className="text-2xl font-bold mt-1">{pending}</p></CardContent></Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Departures by Month (next 6)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--lagoon))" radius={[4, 4, 0, 0]} name="Departures" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Upcoming Departures</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip Code</TableHead>
                    <TableHead>Traveller</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Return</TableHead>
                    <TableHead className="text-right">Pax</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Assigned To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cashflows.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No upcoming trips</TableCell></TableRow>
                  ) : cashflows.map((cf) => (
                    <TableRow key={cf.id}>
                      <TableCell className="font-mono text-xs">{cf.cashflow_code || "—"}</TableCell>
                      <TableCell className="font-medium">{cf.traveller_name || cf.lead?.name || "—"}</TableCell>
                      <TableCell>{cf.destination?.name || "—"}</TableCell>
                      <TableCell className={departureColor(cf.travel_start_date)}>
                        {cf.travel_start_date ? format(new Date(cf.travel_start_date), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell>{cf.travel_end_date ? format(new Date(cf.travel_end_date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-right">{cf.pax_count || "—"}</TableCell>
                      <TableCell className="text-right">{formatINR(Math.round(calcSelling(cf)))}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] capitalize">{cf.status || "—"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px] capitalize">{(cf.trip_stage || "").replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell className="text-xs">{cf.assigned_to ? (userById[cf.assigned_to] || "—") : "—"}</TableCell>
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

export default TripOperationsReport;
