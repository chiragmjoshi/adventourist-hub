import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { Download, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const RevenueReport = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [cashflows, setCashflows] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: cf } = await supabase.from("trip_cashflow").select("*, destination:destinations(name)").gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
      setCashflows(cf || []);
      const cfIds = (cf || []).map((c: any) => c.id);
      if (cfIds.length > 0) {
        const { data: v } = await supabase.from("trip_cashflow_vendors").select("*").in("cashflow_id", cfIds);
        setVendors(v || []);
      } else {
        setVendors([]);
      }
      const { data: d } = await supabase.from("destinations").select("id, name");
      setDestinations(d || []);
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const getVendorCost = (cfId: string) => vendors.filter((v) => v.cashflow_id === cfId).reduce((sum, v) => sum + Number(v.cost_per_pax_incl_gst || 0), 0);

  const calcTrip = (cf: any) => {
    const vendorCostPerPax = getVendorCost(cf.id);
    const pax = cf.pax_count || 1;
    const totalVendor = vendorCostPerPax * pax;
    const marginPct = Number(cf.margin_percent || 0);
    const sellingPreGst = totalVendor / (1 - marginPct / 100);
    return { totalVendor, sellingPreGst, margin: sellingPreGst - totalVendor };
  };

  const totalRevenue = cashflows.reduce((s, cf) => s + calcTrip(cf).sellingPreGst, 0);
  const totalMargin = cashflows.reduce((s, cf) => s + calcTrip(cf).margin, 0);
  const avgMarginPct = cashflows.length > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Revenue by destination
  const byDest = cashflows.reduce((acc: Record<string, { revenue: number; trips: number; name: string }>, cf) => {
    const destName = cf.destination?.name || "Unknown";
    if (!acc[destName]) acc[destName] = { revenue: 0, trips: 0, name: destName };
    acc[destName].revenue += calcTrip(cf).sellingPreGst;
    acc[destName].trips += 1;
    return acc;
  }, {});
  const destData = Object.values(byDest).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);

  // Monthly trend (last 12 months)
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const mStr = format(month, "yyyy-MM");
    const mCf = cashflows.filter((cf) => format(new Date(cf.created_at), "yyyy-MM") === mStr);
    const rev = mCf.reduce((s, cf) => s + calcTrip(cf).sellingPreGst, 0);
    const mar = mCf.reduce((s, cf) => s + calcTrip(cf).margin, 0);
    return { month: format(month, "MMM yy"), revenue: Math.round(rev), margin: Math.round(mar) };
  });

  return (
    <AppLayout title="Revenue Report">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: formatINR(Math.round(totalRevenue)) },
              { label: "Total Margin", value: formatINR(Math.round(totalMargin)) },
              { label: "Avg Margin %", value: `${avgMarginPct.toFixed(1)}%` },
              { label: "Trips", value: cashflows.length.toString() },
            ].map((kpi) => (
              <Card key={kpi.label} className="border shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Revenue & Margin Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => formatINR(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--blaze))" strokeWidth={2} name="Revenue" />
                  <Line type="monotone" dataKey="margin" stroke="hsl(var(--ridge))" strokeWidth={2} name="Margin" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Revenue by Destination</CardTitle></CardHeader>
            <CardContent>
              {destData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(240, destData.length * 40)}>
                  <BarChart data={destData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                    <Bar dataKey="revenue" fill="hsl(var(--lagoon))" radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

export default RevenueReport;
