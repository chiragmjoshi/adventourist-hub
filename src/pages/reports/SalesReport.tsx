import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";
import { Download, TrendingUp, TrendingDown, ArrowLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

import { formatLabel } from "@/lib/formatLabel";

const STATUSES = ["New Lead", "Contacted", "Quote Sent", "File Closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "New Lead": "New Leads",
  "Contacted": "Contacted",
  "Quote Sent": "Quote Sent",
  "File Closed": "Files Closed",
};
const FUNNEL_COLORS = ["hsl(var(--blaze))", "hsl(var(--horizon))", "hsl(var(--lagoon))", "hsl(var(--ridge))"];

const SalesReport = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [leads, setLeads] = useState<any[]>([]);
  const [prevLeads, setPrevLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from("leads").select("*").gte("created_at", from.toISOString()).lte("created_at", to.toISOString());
    setLeads(data || []);

    const diff = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - diff);
    const prevTo = new Date(to.getTime() - diff);
    const { data: prev } = await supabase.from("leads").select("*").gte("created_at", prevFrom.toISOString()).lte("created_at", prevTo.toISOString());
    setPrevLeads(prev || []);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [from, to]);

  const kpis = [
    { label: "Total Leads", value: leads.length, prev: prevLeads.length },
    ...STATUSES.map((s) => ({
      label: STATUS_LABELS[s],
      value: leads.filter((l) => l.sales_status === s).length,
      prev: prevLeads.filter((l) => l.sales_status === s).length,
    })),
    {
      label: "Converted (incl. Query Closed)",
      value: leads.filter((l) => l.sales_status === "File Closed" || l.disposition === "Query Closed").length,
      prev: prevLeads.filter((l) => l.sales_status === "File Closed" || l.disposition === "Query Closed").length,
    },
  ];

  const funnelData = STATUSES.map((s, i) => ({
    stage: STATUS_LABELS[s],
    count: leads.filter((l) => l.sales_status === s).length,
    fill: FUNNEL_COLORS[i],
  }));

  const dispositions = leads.reduce((acc: Record<string, number>, l) => {
    const d = l.disposition || "Unknown";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});
  const dispData = Object.entries(dispositions).map(([name, count]) => ({ name: formatLabel(name), count: count as number })).sort((a, b) => b.count - a.count);

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return (
    <AppLayout title="Sales Report">
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link to="/admin/reports" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />Reports
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">Sales Report</span>
      </div>
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">{[...Array(5)].map((_, i) => <Card key={i} className="border"><CardContent className="p-5"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {kpis.map((kpi) => {
              const change = pctChange(kpi.value, kpi.prev);
              return (
                <Card key={kpi.label} className="border shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {change >= 0 ? <TrendingUp className="h-3 w-3 text-ridge" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                      <span className={`text-xs font-medium ${change >= 0 ? "text-ridge" : "text-destructive"}`}>{change >= 0 ? "+" : ""}{change}%</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>{funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-base">Disposition Breakdown</CardTitle></CardHeader>
              <CardContent>
                {dispData.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={dispData} layout="vertical" margin={{ left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--lagoon))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
};

export default SalesReport;
