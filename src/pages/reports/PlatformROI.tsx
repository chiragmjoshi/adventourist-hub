import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const PlatformROI = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [leads, setLeads] = useState<any[]>([]);
  const [cashflows, setCashflows] = useState<any[]>([]);
  const [cfVendors, setCfVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: l }, { data: cf }] = await Promise.all([
        supabase.from("leads").select("*").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
        supabase.from("trip_cashflow").select("*").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
      ]);
      setLeads(l || []);
      setCashflows(cf || []);
      if ((cf || []).length > 0) {
        const { data: v } = await supabase.from("trip_cashflow_vendors").select("*").in("cashflow_id", (cf || []).map((c: any) => c.id));
        setCfVendors(v || []);
      }
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const buildTable = (field: string) => {
    const map: Record<string, { key: string; leads: number; closed: number; revenue: number }> = {};
    leads.forEach((l) => {
      const k = (l as any)[field] || "Direct";
      if (!map[k]) map[k] = { key: k, leads: 0, closed: 0, revenue: 0 };
      map[k].leads++;
      if (l.sales_status === "file_closed") map[k].closed++;
    });
    // Revenue from cashflows matched by lead platform
    cashflows.forEach((cf) => {
      const lead = leads.find((l) => l.id === cf.lead_id);
      const k = lead ? ((lead as any)[field] || "Direct") : "Direct";
      if (!map[k]) map[k] = { key: k, leads: 0, closed: 0, revenue: 0 };
      const vc = cfVendors.filter((v) => v.cashflow_id === cf.id).reduce((s, v) => s + Number(v.cost_per_pax_incl_gst || 0), 0) * (cf.pax_count || 1);
      const mp = Number(cf.margin_percent || 0);
      map[k].revenue += vc / (1 - mp / 100);
    });
    return Object.values(map).sort((a, b) => b.leads - a.leads);
  };

  const sections = [
    { title: "Platform Breakdown", data: buildTable("platform") },
    { title: "Channel Breakdown", data: buildTable("channel") },
    { title: "Campaign Type Breakdown", data: buildTable("campaign_type") },
    { title: "Ad Group Breakdown", data: buildTable("ad_group") },
  ];

  const bestPlatform = sections[0].data[0]?.key || "—";
  const bestChannel = sections[1].data[0]?.key || "—";

  return (
    <AppLayout title="Platform ROI Report">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best Platform</p><p className="text-lg font-bold mt-1 truncate">{bestPlatform}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best Channel</p><p className="text-lg font-bold mt-1 truncate">{bestChannel}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Leads</p><p className="text-2xl font-bold mt-1">{leads.length}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Closed</p><p className="text-2xl font-bold mt-1">{leads.filter((l) => l.sales_status === "file_closed").length}</p></CardContent></Card>
          </div>

          {sections.map((s) => (
            <Card key={s.title} className="border shadow-sm mb-6">
              <CardHeader className="pb-2"><CardTitle className="text-base">{s.title}</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{s.title.split(" ")[0]}</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Closed</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Conversion %</TableHead>
                      <TableHead className="text-right">Avg Ticket</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.data.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell className="font-medium">{r.key}</TableCell>
                        <TableCell className="text-right">{r.leads}</TableCell>
                        <TableCell className="text-right">{r.closed}</TableCell>
                        <TableCell className="text-right">{formatINR(Math.round(r.revenue))}</TableCell>
                        <TableCell className="text-right">{r.leads > 0 ? ((r.closed / r.leads) * 100).toFixed(1) : 0}%</TableCell>
                        <TableCell className="text-right">{r.closed > 0 ? formatINR(Math.round(r.revenue / r.closed)) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </AppLayout>
  );
};

export default PlatformROI;
