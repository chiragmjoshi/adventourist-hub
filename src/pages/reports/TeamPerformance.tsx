import { useState, useEffect } from "react";
import { startOfMonth, endOfMonth } from "date-fns";
import { Download, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AppLayout from "@/components/AppLayout";
import DateRangePicker from "@/components/DateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const TeamPerformance = () => {
  const [from, setFrom] = useState(startOfMonth(new Date()));
  const [to, setTo] = useState(endOfMonth(new Date()));
  const [leads, setLeads] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [{ data: l }, { data: u }] = await Promise.all([
        supabase.from("leads").select("*").gte("created_at", from.toISOString()).lte("created_at", to.toISOString()),
        supabase.from("users").select("*").eq("is_active", true),
      ]);
      setLeads(l || []);
      setUsers(u || []);
      setLoading(false);
    };
    fetch();
  }, [from, to]);

  const agentStats = users.map((u) => {
    const agentLeads = leads.filter((l) => l.assigned_to === u.id);
    const closed = agentLeads.filter((l) => l.sales_status === "file_closed").length;
    const lost = agentLeads.filter((l) => l.disposition === "file_lost").length;
    const contacted = agentLeads.filter((l) => ["contacted", "quote_sent", "file_closed"].includes(l.sales_status)).length;
    const quoted = agentLeads.filter((l) => ["quote_sent", "file_closed"].includes(l.sales_status)).length;
    return {
      id: u.id, name: u.name, email: u.email,
      total: agentLeads.length, contacted, quoted, closed, lost,
      conversionRate: agentLeads.length > 0 ? (closed / agentLeads.length) * 100 : 0,
    };
  }).filter((a) => a.total > 0).sort((a, b) => b.closed - a.closed);

  const trophyColors = ["text-horizon", "text-muted-foreground", "text-primary"];
  const top3 = agentStats.slice(0, 3);

  const chartData = agentStats.slice(0, 10).map((a) => ({ name: a.name.split(" ")[0], leads: a.total, closed: a.closed, lost: a.lost }));

  return (
    <AppLayout title="Team Performance">
      <div className="flex items-center justify-between mb-6">
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
        <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">{[...Array(3)].map((_, i) => <Card key={i}><CardContent className="p-5"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>)}</div>
      ) : (
        <>
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {top3.map((a, i) => (
                <Card key={a.id} className="border shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">{a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <Trophy className={`absolute -top-1 -right-1 h-4 w-4 ${trophyColors[i]}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.closed} closed · {a.total} leads</p>
                      <p className="text-xs text-ridge font-medium">{a.conversionRate.toFixed(1)}% conversion</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border shadow-sm mb-6">
            <CardHeader className="pb-2"><CardTitle className="text-base">Full Team Table</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead><TableHead className="text-right">Assigned</TableHead><TableHead className="text-right">Contacted</TableHead><TableHead className="text-right">Quoted</TableHead><TableHead className="text-right">Closed</TableHead><TableHead className="text-right">Lost</TableHead><TableHead className="text-right">Conversion %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentStats.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary text-primary-foreground">{a.name[0]}</AvatarFallback></Avatar>
                          <span className="font-medium text-sm">{a.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{a.total}</TableCell>
                      <TableCell className="text-right">{a.contacted}</TableCell>
                      <TableCell className="text-right">{a.quoted}</TableCell>
                      <TableCell className="text-right">{a.closed}</TableCell>
                      <TableCell className="text-right">{a.lost}</TableCell>
                      <TableCell className="text-right font-medium">{a.conversionRate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-base">Performance Chart</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No data for this period</div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leads" fill="hsl(var(--lagoon))" name="Leads" />
                    <Bar dataKey="closed" fill="hsl(var(--ridge))" name="Closed" />
                    <Bar dataKey="lost" fill="hsl(var(--destructive))" name="Lost" />
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

export default TeamPerformance;
