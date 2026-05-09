import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flame, Clock, Sparkles, Users, CheckCircle, DollarSign, Percent, ArrowRight, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";

const REFETCH_MS = 60_000;

/* ─────────── helpers ─────────── */
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
const startOfPrevMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
};
const endOfPrevMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
const last24h = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const today = () => new Date().toISOString().split("T")[0];
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

const timeAgo = (iso: string) => {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

const STATUS_COLORS: Record<string, string> = {
  new_lead: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-800",
  qualified: "bg-green-100 text-green-700",
  proposal_sent: "bg-purple-100 text-purple-700",
  confirmed: "bg-ridge/15 text-ridge",
  dropped: "bg-gray-100 text-gray-500",
};

const PLATFORM_COLOR: Record<string, string> = {
  Paid: "hsl(var(--blaze))",
  Referral: "hsl(var(--horizon))",
  Organic: "hsl(var(--lagoon))",
  Content: "hsl(var(--ridge))",
};
const PLATFORM_GROUPS = ["Paid", "Referral", "Organic", "Content"] as const;

/* ─────────── component ─────────── */
const Dashboard = () => {
  const navigate = useNavigate();

  /* ── Action strip counts ── */
  const { data: actionCounts, isLoading: loadingAction } = useQuery({
    queryKey: ["dash-action-strip"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const [hot, followup, fresh] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true })
          .eq("is_hot", true)
          .not("sales_status", "in", "(confirmed,dropped)"),
        supabase.from("leads").select("*", { count: "exact", head: true })
          .lte("follow_up_date", today())
          .not("sales_status", "in", "(confirmed,dropped)"),
        supabase.from("leads").select("*", { count: "exact", head: true })
          .gte("created_at", last24h()),
      ]);
      return { hot: hot.count ?? 0, followup: followup.count ?? 0, fresh: fresh.count ?? 0 };
    },
  });

  /* ── KPI row ── */
  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ["dash-kpis"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const monthStart = startOfMonth();
      const prevStart = startOfPrevMonth();
      const prevEnd = endOfPrevMonth();

      const [thisMonthLeads, prevMonthLeads, closedFiles, cashflows] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", monthStart),
        supabase.from("leads").select("*", { count: "exact", head: true })
          .gte("created_at", prevStart).lt("created_at", prevEnd),
        supabase.from("trip_cashflow").select("*", { count: "exact", head: true })
          .eq("trip_stage", "trip_sold").gte("created_at", monthStart),
        supabase.from("trip_cashflow")
          .select("pax_count, margin_percent, trip_cashflow_vendors(cost_per_pax_incl_gst)")
          .gte("created_at", monthStart),
      ]);

      // Revenue + avg margin
      let revenue = 0;
      let marginSum = 0;
      let marginCount = 0;
      for (const tc of (cashflows.data ?? []) as any[]) {
        const pax = tc.pax_count ?? 1;
        const baseCost = (tc.trip_cashflow_vendors ?? []).reduce(
          (s: number, v: any) => s + Number(v.cost_per_pax_incl_gst ?? 0), 0,
        );
        const sellPerPax = baseCost * (1 + Number(tc.margin_percent ?? 0) / 100);
        revenue += sellPerPax * pax;
        if (tc.margin_percent != null) {
          marginSum += Number(tc.margin_percent);
          marginCount++;
        }
      }

      const tm = thisMonthLeads.count ?? 0;
      const pm = prevMonthLeads.count ?? 0;
      const change = pm > 0 ? ((tm - pm) / pm) * 100 : tm > 0 ? 100 : 0;

      return {
        leadsThisMonth: tm,
        leadsChangePct: change,
        filesClosed: closedFiles.count ?? 0,
        revenueLakhs: revenue / 100000,
        avgMargin: marginCount ? marginSum / marginCount : 0,
      };
    },
  });

  /* ── Lead funnel ── */
  const { data: funnelData, isLoading: loadingFunnel } = useQuery({
    queryKey: ["dash-funnel"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("sales_status");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const k = r.sales_status ?? "new_lead";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      const order = ["new_lead", "contacted", "qualified", "proposal_sent", "confirmed"];
      const labels: Record<string, string> = {
        new_lead: "New", contacted: "Contacted", qualified: "Qualified",
        proposal_sent: "Proposal", confirmed: "Closed",
      };
      const fills = ["hsl(var(--blaze))", "hsl(var(--horizon))", "hsl(var(--lagoon))", "hsl(var(--ridge))", "hsl(var(--abyss))"];
      return order.map((k, i) => ({ stage: labels[k], count: counts[k] ?? 0, fill: fills[i] }));
    },
  });

  /* ── Source breakdown (this month) ── */
  const { data: sourceData, isLoading: loadingSource } = useQuery({
    queryKey: ["dash-source"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("platform").gte("created_at", startOfMonth());
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const p = (r.platform ?? "Organic").toString();
        const key = PLATFORM_GROUPS.includes(p as any) ? p : "Organic";
        counts[key] = (counts[key] ?? 0) + 1;
      }
      const total = Object.values(counts).reduce((s, n) => s + n, 0);
      return PLATFORM_GROUPS.map(p => ({
        name: p,
        value: counts[p] ?? 0,
        pct: total > 0 ? Math.round(((counts[p] ?? 0) / total) * 100) : 0,
        fill: PLATFORM_COLOR[p],
      }));
    },
  });

  /* ── Trips this week ── */
  const { data: weekTrips, isLoading: loadingTrips } = useQuery({
    queryKey: ["dash-week-trips"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_cashflow")
        .select("id, traveller_name, travel_start_date, trip_stage, destinations:destination_id(name)")
        .gte("travel_start_date", today())
        .lte("travel_start_date", plusDays(7))
        .order("travel_start_date", { ascending: true })
        .limit(8);
      return (data ?? []) as any[];
    },
  });

  /* ── Top destinations this month ── */
  const { data: topDest, isLoading: loadingDest } = useQuery({
    queryKey: ["dash-top-dest"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("destinations:destination_id(name)")
        .gte("created_at", startOfMonth());
      const counts: Record<string, number> = {};
      for (const r of (data ?? []) as any[]) {
        const n = r.destinations?.name;
        if (!n) continue;
        counts[n] = (counts[n] ?? 0) + 1;
      }
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    },
  });

  /* ── Recent leads ── */
  const { data: recentLeads, isLoading: loadingRecent } = useQuery({
    queryKey: ["dash-recent-leads"],
    refetchInterval: REFETCH_MS,
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, sales_status, platform, channel, is_hot, created_at, destinations:destination_id(name)")
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as any[];
    },
  });

  /* ─────────── render ─────────── */
  const marginColor = (m: number) =>
    m > 20 ? "text-ridge" : m >= 15 ? "text-horizon" : "text-destructive";

  return (
    <AppLayout title="Dashboard">
      {/* ── ACTION STRIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <ActionCard
          loading={loadingAction}
          onClick={() => navigate("/admin/leads?filter=hot")}
          label="Hot Leads"
          icon={<Flame className="h-5 w-5" />}
          count={actionCounts?.hot ?? 0}
          bg="bg-blaze"
          fg="text-white"
          sub="Need attention now"
        />
        <ActionCard
          loading={loadingAction}
          onClick={() => navigate("/admin/leads?filter=followup")}
          label="Follow-ups Due Today"
          icon={<Clock className="h-5 w-5" />}
          count={actionCounts?.followup ?? 0}
          bg="bg-horizon"
          fg="text-abyss"
          sub="Scheduled for today"
        />
        <ActionCard
          loading={loadingAction}
          onClick={() => navigate("/admin/leads?filter=new")}
          label="New Leads (24h)"
          icon={<Sparkles className="h-5 w-5" />}
          count={actionCounts?.fresh ?? 0}
          bg="bg-lagoon"
          fg="text-white"
          sub="Came in last 24 hours"
        />
      </div>

      {/* ── KPI ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          loading={loadingKpis}
          icon={Users}
          title="Total Leads This Month"
          value={kpis ? kpis.leadsThisMonth.toLocaleString("en-IN") : "0"}
          changePct={kpis?.leadsChangePct}
        />
        <KpiCard
          loading={loadingKpis}
          icon={CheckCircle}
          title="Files Closed This Month"
          value={kpis ? kpis.filesClosed.toString() : "0"}
        />
        <KpiCard
          loading={loadingKpis}
          icon={DollarSign}
          title="Revenue This Month"
          value={kpis ? `₹${kpis.revenueLakhs.toFixed(1)}L` : "₹0"}
        />
        <KpiCard
          loading={loadingKpis}
          icon={Percent}
          title="Avg Margin %"
          value={kpis ? `${kpis.avgMargin.toFixed(1)}%` : "0%"}
          valueClass={kpis ? marginColor(kpis.avgMargin) : ""}
        />
      </div>

      {/* ── TWO COLUMN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* LEFT 60% */}
        <div className="lg:col-span-3 space-y-4">
          {/* Funnel */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-abyss">Lead Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingFunnel ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {(funnelData ?? []).map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Source breakdown */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-abyss">Lead Source Breakdown (this month)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSource ? (
                <Skeleton className="h-[240px] w-full" />
              ) : (sourceData ?? []).every(s => s.value === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-12">No leads this month yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                        {(sourceData ?? []).map((entry, i) => (<Cell key={i} fill={entry.fill} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {(sourceData ?? []).map(s => (
                      <div key={s.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ background: s.fill }} />
                          <span className="text-abyss font-medium">{s.name}</span>
                        </div>
                        <div className="text-muted-foreground">
                          <span className="text-abyss font-semibold">{s.value}</span> · {s.pct}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT 40% */}
        <div className="lg:col-span-2 space-y-4">
          {/* Trips this week */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-abyss">Trips This Week</CardTitle>
              <button onClick={() => navigate("/admin/trips-kanban")} className="text-xs text-blaze hover:underline">All</button>
            </CardHeader>
            <CardContent>
              {loadingTrips ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (weekTrips ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming trips this week.</p>
              ) : (
                <div className="space-y-1">
                  {(weekTrips ?? []).map(t => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/admin/trip-cashflow/${t.id}`)}
                      className="w-full flex items-center justify-between gap-2 p-2 rounded-md hover:bg-[#FFF5F2] transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-abyss truncate">{t.traveller_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{t.destinations?.name ?? "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-blaze flex items-center gap-1 justify-end">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.travel_start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top destinations */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-abyss">Top Destinations (this month)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDest ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-6 w-full" />)}</div>
              ) : (topDest ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No destination data yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {(() => {
                    const max = Math.max(...(topDest ?? []).map(d => d.count), 1);
                    return (topDest ?? []).map(d => (
                      <div key={d.name}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-abyss">{d.name}</span>
                          <span className="text-muted-foreground">{d.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#F3F0EA] overflow-hidden">
                          <div className="h-full bg-blaze rounded-full" style={{ width: `${(d.count / max) * 100}%` }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── RECENT LEADS ── */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-abyss">Recent Leads</CardTitle>
          <button onClick={() => navigate("/admin/leads")} className="text-xs text-blaze hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (recentLeads ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No leads yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-xs text-[#9CA3AF] uppercase tracking-wider border-b border-[#F0EDE8]">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Destination</th>
                    <th className="py-2 pr-4 font-medium">Platform</th>
                    <th className="py-2 pr-4 font-medium">Channel</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentLeads ?? []).map(l => (
                    <tr
                      key={l.id}
                      onClick={() => navigate(`/admin/leads/${l.id}`)}
                      className="border-b border-[#F5F3EE] last:border-0 hover:bg-[#FFF5F2] cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 pr-4 font-medium text-abyss">
                        <div className="flex items-center gap-1.5">
                          {l.is_hot && <span title="Hot">🔥</span>}
                          {l.name}
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{l.destinations?.name ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{l.platform ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{l.channel ?? "—"}</td>
                      <td className="py-2.5 pr-4">
                        <Badge className={`${STATUS_COLORS[l.sales_status] ?? "bg-gray-100 text-gray-600"} font-medium`}>
                          {(l.sales_status ?? "new_lead").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground whitespace-nowrap">{timeAgo(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

/* ─────────── small components ─────────── */
function ActionCard({
  loading, onClick, label, icon, count, bg, fg, sub,
}: {
  loading: boolean; onClick: () => void; label: string; icon: React.ReactNode;
  count: number; bg: string; fg: string; sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${bg} ${fg} rounded-xl p-5 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-90 flex items-center gap-1.5">
          {icon}{label}
        </span>
        <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
      </div>
      {loading ? (
        <Skeleton className="h-9 w-16 bg-white/30" />
      ) : (
        <p className="text-3xl font-bold leading-none">{count}</p>
      )}
      <p className="text-xs opacity-75 mt-1.5">{sub}</p>
    </button>
  );
}

function KpiCard({
  loading, icon: Icon, title, value, changePct, valueClass = "",
}: {
  loading: boolean; icon: any; title: string; value: string;
  changePct?: number; valueClass?: string;
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-2" />
            ) : (
              <p className={`text-2xl font-bold mt-1 ${valueClass || "text-abyss"}`}>{value}</p>
            )}
            {!loading && changePct != null && (
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-medium ${changePct >= 0 ? "text-ridge" : "text-destructive"}`}>
                  {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className="h-10 w-10 rounded-lg bg-blaze/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-blaze" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Dashboard;
