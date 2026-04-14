import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";

const ConversionReport = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [leads, setLeads] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data: l } = await supabase.from("leads").select("*, destination:destinations(name)").gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
      setLeads(l || []);
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const total = leads.length;
  const contacted = leads.filter((l) => ["contacted", "quote_sent", "file_closed"].includes(l.sales_status)).length;
  const quoted = leads.filter((l) => ["quote_sent", "file_closed"].includes(l.sales_status)).length;
  const closed = leads.filter((l) => l.sales_status === "file_closed").length;
  const lost = leads.filter((l) => l.disposition === "file_lost").length;
  const conversionRate = total > 0 ? ((closed / total) * 100).toFixed(1) : "0";

  const funnelData = [
    { stage: "Total Leads", count: total, pct: 100 },
    { stage: "Contacted", count: contacted, pct: total > 0 ? Math.round((contacted / total) * 100) : 0 },
    { stage: "Quote Sent", count: quoted, pct: contacted > 0 ? Math.round((quoted / contacted) * 100) : 0 },
    { stage: "File Closed", count: closed, pct: quoted > 0 ? Math.round((closed / quoted) * 100) : 0 },
  ];
  const funnelColors = ["hsl(var(--lagoon))", "hsl(var(--horizon))", "hsl(var(--blaze))", "hsl(var(--ridge))"];

  // By platform
  const byPlatform = leads.reduce((acc: Record<string, any>, l) => {
    const p = l.platform || "Direct";
    if (!acc[p]) acc[p] = { platform: p, total: 0, contacted: 0, quoted: 0, closed: 0, lost: 0 };
    acc[p].total++;
    if (["contacted", "quote_sent", "file_closed"].includes(l.sales_status)) acc[p].contacted++;
    if (["quote_sent", "file_closed"].includes(l.sales_status)) acc[p].quoted++;
    if (l.sales_status === "file_closed") acc[p].closed++;
    if (l.disposition === "file_lost") acc[p].lost++;
    return acc;
  }, {});
  const platformData = Object.values(byPlatform).sort((a: any, b: any) => (b.total > 0 ? b.closed / b.total : 0) - (a.total > 0 ? a.closed / a.total : 0));

  // By destination
  const byDest = leads.reduce((acc: Record<string, any>, l) => {
    const d = l.destination?.name || "Unknown";
    if (!acc[d]) acc[d] = { dest: d, total: 0, closed: 0 };
    acc[d].total++;
    if (l.sales_status === "file_closed") acc[d].closed++;
    return acc;
  }, {});
  const destData = Object.values(byDest).sort((a: any, b: any) => (b.total > 0 ? b.closed / b.total : 0) - (a.total > 0 ? a.closed / a.total : 0));

  const rateColor = (rate: number) => rate > 20 ? "text-ridge" : rate > 10 ? "text-horizon" : "text-destructive";

  return (
    <AppLayout title="Conversion Report">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Conversion Rate</p><p className="text-2xl font-bold mt-1">{conversionRate}%</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Files Closed</p><p className="text-2xl font-bold mt-1">{closed}</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lost Rate</p><p className="text-2xl font-bold mt-1">{total > 0 ? ((lost / total) * 100).toFixed(1) : 0}%</p></CardContent></Card>
            <Card className="border shadow-sm"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Best Platform</p><p className="text-2xl font-bold mt-1 truncate">{platformData.length > 0 ? (platformData[0] as any).platform : "—"}</p></CardContent></Card>
          </div>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(v: number, name: string, props: any) => [`${v} (${props.payload.pct}%)`, "Count"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>{funnelData.map((_, i) => <Cell key={i} fill={funnelColors[i]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Conversion by Platform</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Contacted</TableHead><TableHead className="text-right">Quoted</TableHead><TableHead className="text-right">Closed</TableHead><TableHead className="text-right">Lost</TableHead><TableHead className="text-right">Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformData.map((p: any) => {
                    const rate = p.total > 0 ? (p.closed / p.total) * 100 : 0;
                    return (
                      <TableRow key={p.platform}>
                        <TableCell className="font-medium">{p.platform}</TableCell>
                        <TableCell className="text-right">{p.total}</TableCell>
                        <TableCell className="text-right">{p.contacted}</TableCell>
                        <TableCell className="text-right">{p.quoted}</TableCell>
                        <TableCell className="text-right">{p.closed}</TableCell>
                        <TableCell className="text-right">{p.lost}</TableCell>
                        <TableCell className={`text-right font-medium ${rateColor(rate)}`}>{rate.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Conversion by Destination</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Destination</TableHead><TableHead className="text-right">Total Leads</TableHead><TableHead className="text-right">Closed</TableHead><TableHead className="text-right">Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {destData.map((d: any) => {
                    const rate = d.total > 0 ? (d.closed / d.total) * 100 : 0;
                    return (
                      <TableRow key={d.dest}>
                        <TableCell className="font-medium">{d.dest}</TableCell>
                        <TableCell className="text-right">{d.total}</TableCell>
                        <TableCell className="text-right">{d.closed}</TableCell>
                        <TableCell className={`text-right font-medium ${rateColor(rate)}`}>{rate.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </AppLayout>
  );
};

export default ConversionReport;
