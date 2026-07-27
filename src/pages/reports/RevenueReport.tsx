import { useState, useEffect, useMemo } from "react";
import { subMonths, format } from "date-fns";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

type CashflowRow = {
  id: string;
  booking_date: string | null;
  travel_start_date: string | null;
  created_at: string | null;
  destination_id: string | null;
  pax_count: number | null;
  margin_percent: number | null;
  gst_billing: boolean | null;
};

type VendorLine = {
  cashflow_id: string;
  cost_per_pax_incl_gst: number | string | null;
};

type DestinationRow = {
  id: string;
  name: string;
};

const chunk = <T,>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const endOfSelectedDay = (date: Date) => {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
};

const RevenueReport = () => {
  const [from, setFrom] = useState(new Date(2020, 0, 1));
  const [to, setTo] = useState(new Date(new Date().getFullYear() + 1, 11, 31));
  const [allCashflows, setAllCashflows] = useState<CashflowRow[]>([]);
  const [vendors, setVendors] = useState<VendorLine[]>([]);
  const [destinations, setDestinations] = useState<DestinationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: cf, error: cashflowError }, { data: d, error: destinationsError }] = await Promise.all([
        supabase
        .from("trip_cashflow")
          .select("id, booking_date, travel_start_date, created_at, destination_id, pax_count, margin_percent, gst_billing")
          .order("created_at", { ascending: false }),
        supabase.from("destinations").select("id, name"),
      ]);

      if (cashflowError) console.error("Revenue report cashflow fetch failed", cashflowError);
      if (destinationsError) console.error("Revenue report destination fetch failed", destinationsError);

      setAllCashflows(cf || []);
      setDestinations(d || []);

      const cfIds = (cf || []).map((c) => c.id);
      if (cfIds.length > 0) {
        const results = await Promise.all(
          chunk(cfIds, 75).map((ids) =>
            supabase
              .from("trip_cashflow_vendors")
              .select("cashflow_id, cost_per_pax_incl_gst")
              .in("cashflow_id", ids)
          )
        );

        const vendorLines = results.flatMap((result) => {
          if (result.error) {
            console.error("Revenue report vendor fetch failed", result.error);
            return [];
          }
          return result.data || [];
        });
        setVendors(vendorLines);
      } else {
        setVendors([]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const destinationById = useMemo(() => {
    const map = new Map<string, string>();
    destinations.forEach((destination) => map.set(destination.id, destination.name));
    return map;
  }, [destinations]);

  const effectiveDate = (cf: CashflowRow): Date => {
    const raw = cf.booking_date || cf.travel_start_date || cf.created_at;
    return raw ? new Date(raw) : new Date(0);
  };

  const cashflows = useMemo(
    () => allCashflows.filter((cf) => {
      const d = effectiveDate(cf);
      return d >= from && d <= endOfSelectedDay(to);
    }),
    [allCashflows, from, to]
  );

  const getVendorCost = (cfId: string) => vendors.filter((v) => v.cashflow_id === cfId).reduce((sum, v) => sum + Number(v.cost_per_pax_incl_gst || 0), 0);

  const calcTrip = (cf: CashflowRow) => {
    const vendorCostPerPax = getVendorCost(cf.id);
    const pax = cf.pax_count || 1;
    const totalVendor = vendorCostPerPax * pax;
    const marginPct = Number(cf.margin_percent || 0);
    const marginAmount = totalVendor * (marginPct / 100);
    const sellingExGst = totalVendor + marginAmount;
    const gstRate = 5;
    const gstAmount = cf.gst_billing ? sellingExGst * (gstRate / 100) : 0;
    const finalPrice = sellingExGst + gstAmount;
    return {
      totalVendor,
      marginAmount,
      margin: marginAmount,
      sellingPreGst: sellingExGst,
      sellingExGst,
      gstAmount,
      finalPrice,
      grossMarginPct: sellingExGst > 0 ? (marginAmount / sellingExGst) * 100 : 0,
    };
  };

  const totalRevenue = cashflows.reduce((s, cf) => s + calcTrip(cf).sellingExGst, 0);
  const totalMargin = cashflows.reduce((s, cf) => s + calcTrip(cf).marginAmount, 0);
  const totalGst = cashflows.reduce((s, cf) => s + calcTrip(cf).gstAmount, 0);
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  // Revenue by destination
  const byDest = cashflows.reduce((acc: Record<string, { revenue: number; trips: number; name: string }>, cf) => {
    const destName = cf.destination_id ? destinationById.get(cf.destination_id) || "Unknown" : "Unknown";
    if (!acc[destName]) acc[destName] = { revenue: 0, trips: 0, name: destName };
    acc[destName].revenue += calcTrip(cf).sellingExGst;
    acc[destName].trips += 1;
    return acc;
  }, {});
  const destData = Object.values(byDest).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 10);

  // Monthly trend (last 12 months) — grouped by effective date
  const trendData = Array.from({ length: 12 }, (_, i) => {
    const month = subMonths(new Date(), 11 - i);
    const mStr = format(month, "yyyy-MM");
    const mCf = allCashflows.filter((cf) => format(effectiveDate(cf), "yyyy-MM") === mStr);
    const rev = mCf.reduce((s, cf) => s + calcTrip(cf).sellingExGst, 0);
    const mar = mCf.reduce((s, cf) => s + calcTrip(cf).marginAmount, 0);
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: formatINR(Math.round(totalRevenue)) },
              { label: "Total Margin", value: formatINR(Math.round(totalMargin)) },
              { label: "Avg Margin %", value: `${avgMarginPct.toFixed(1)}%` },
              { label: "Total GST Collected", value: formatINR(Math.round(totalGst)) },
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
