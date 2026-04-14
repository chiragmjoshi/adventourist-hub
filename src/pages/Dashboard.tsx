import { TrendingUp, TrendingDown, Users, CheckCircle, DollarSign, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import AppLayout from "@/components/AppLayout";

const kpiCards = [
  { title: "Total Leads", value: "1,284", change: "+12.5%", trend: "up", icon: Users },
  { title: "Files Closed", value: "156", change: "+8.2%", trend: "up", icon: CheckCircle },
  { title: "Revenue This Month", value: "₹24.6L", change: "-3.1%", trend: "down", icon: DollarSign },
  { title: "Avg Margin %", value: "22.4%", change: "+1.8%", trend: "up", icon: Percent },
] as const;

const funnelData = [
  { stage: "New", count: 420, fill: "hsl(var(--blaze))" },
  { stage: "Contacted", count: 310, fill: "hsl(var(--horizon))" },
  { stage: "Qualified", count: 180, fill: "hsl(var(--lagoon))" },
  { stage: "Proposal", count: 95, fill: "hsl(var(--ridge))" },
  { stage: "Closed", count: 42, fill: "hsl(var(--chart-5))" },
];

const revenueData = [
  { month: "Nov", revenue: 18.2 },
  { month: "Dec", revenue: 22.5 },
  { month: "Jan", revenue: 19.8 },
  { month: "Feb", revenue: 25.1 },
  { month: "Mar", revenue: 28.3 },
  { month: "Apr", revenue: 24.6 },
];

const activityFeed = [
  { id: 1, text: "New lead Rahul Mehta assigned to Priya", time: "2 min ago", type: "lead" },
  { id: 2, text: "Goa Deluxe itinerary published", time: "15 min ago", type: "itinerary" },
  { id: 3, text: "Payment received for TRV-1042", time: "1 hr ago", type: "payment" },
  { id: 4, text: "Lead TRV-1038 moved to Qualified", time: "2 hr ago", type: "status" },
  { id: 5, text: "New vendor Skyline Hotels added", time: "3 hr ago", type: "vendor" },
];

const Dashboard = () => {
  return (
    <AppLayout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-ridge" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-xs font-medium ${kpi.trend === "up" ? "text-ridge" : "text-destructive"}`}>
                      {kpi.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Lead Funnel */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Revenue Trend (₹ Lakhs)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--blaze))" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activityFeed.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <p className="text-sm">{item.text}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{item.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Dashboard;
