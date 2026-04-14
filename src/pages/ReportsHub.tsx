import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, DollarSign, TrendingUp, MapPin, BarChart3, Trophy, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/hooks/useRBAC";
import { startOfMonth, endOfMonth } from "date-fns";

const ReportsHub = () => {
  const navigate = useNavigate();
  const { hasPermission } = useRBAC();
  const [stats, setStats] = useState({ leadsThisMonth: 0, conversionRate: 0 });

  useEffect(() => {
    const from = startOfMonth(new Date()).toISOString();
    const to = endOfMonth(new Date()).toISOString();
    const fetchStats = async () => {
      const { count: leadCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to);
      const { count: closedCount } = await supabase.from("leads").select("*", { count: "exact", head: true }).gte("created_at", from).lte("created_at", to).eq("sales_status", "file_closed");
      const rate = leadCount && leadCount > 0 ? Math.round(((closedCount || 0) / leadCount) * 100) : 0;
      setStats({ leadsThisMonth: leadCount || 0, conversionRate: rate });
    };
    fetchStats();
  }, []);

  const reports = [
    { id: "sales", name: "Sales Report", desc: "Lead volume, conversion funnel, team performance", icon: Users, preview: `${stats.leadsThisMonth} leads this month`, url: "/reports/sales", perm: "reports_sales" },
    { id: "revenue", name: "Revenue Report", desc: "Monthly revenue, destination-wise P&L, margin analysis", icon: DollarSign, preview: "View revenue data", url: "/reports/revenue", perm: "reports_revenue", restrictLabel: "Admin & Finance only" },
    { id: "conversion", name: "Conversion Report", desc: "Lead to closure rates by source, platform and campaign", icon: TrendingUp, preview: `${stats.conversionRate}% conversion rate`, url: "/reports/conversion", perm: "reports_conversion" },
    { id: "destinations", name: "Destination Report", desc: "Top destinations by leads, revenue and margin", icon: MapPin, preview: "View destination data", url: "/reports/destinations", perm: "reports_destinations" },
    { id: "platform-roi", name: "Platform ROI Report", desc: "Revenue and conversion by platform, channel and campaign", icon: BarChart3, preview: "View platform data", url: "/reports/platform-roi", perm: "reports_platform_roi", restrictLabel: "Admin only" },
    { id: "team", name: "Team Performance", desc: "Individual agent metrics — leads, closures, revenue", icon: Trophy, preview: "View team data", url: "/reports/team", perm: "reports_team", restrictLabel: "Admin only" },
  ];

  return (
    <AppLayout title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => {
          const allowed = hasPermission(r.perm);
          return (
            <Card key={r.id} className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(r.url)}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${allowed ? "bg-primary/10" : "bg-muted"}`}>
                    {allowed ? <r.icon className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{r.name}</h3>
                      {!allowed && r.restrictLabel && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{r.restrictLabel}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
                    <p className="text-xs text-primary font-medium mt-2">{r.preview}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">{allowed ? "View Report" : "View Report"}</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
};

export default ReportsHub;
