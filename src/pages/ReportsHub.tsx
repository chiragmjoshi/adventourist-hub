import { useNavigate } from "react-router-dom";
import { Users, DollarSign, TrendingUp, MapPin, BarChart3, Trophy, Lock, Truck, Map } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";
import { useRBAC } from "@/hooks/useRBAC";

const ReportsHub = () => {
  const navigate = useNavigate();
  const { hasPermission } = useRBAC();

  const reports = [
    { id: "sales", name: "Sales Report", desc: "Lead volume, conversion funnel, team performance", icon: Users, preview: "View leads data", url: "/admin/reports/sales", perm: "reports_sales" },
    { id: "revenue", name: "Revenue Report", desc: "Monthly revenue, destination-wise P&L, margin analysis", icon: DollarSign, preview: "View revenue data", url: "/admin/reports/revenue", perm: "reports_revenue", restrictLabel: "Admin & Finance only" },
    { id: "conversion", name: "Conversion Report", desc: "Lead to closure rates by source, platform and campaign", icon: TrendingUp, preview: "View conversion data", url: "/admin/reports/conversion", perm: "reports_conversion" },
    { id: "destinations", name: "Destination Report", desc: "Top destinations by leads, revenue and margin", icon: MapPin, preview: "View destination data", url: "/admin/reports/destinations", perm: "reports_destinations" },
    { id: "platform-roi", name: "Platform ROI Report", desc: "Revenue and conversion by platform, channel and campaign", icon: BarChart3, preview: "View platform data", url: "/admin/reports/platform-roi", perm: "reports_platform_roi", restrictLabel: "Admin only" },
    { id: "team", name: "Team Performance", desc: "Individual agent metrics — leads, closures, revenue", icon: Trophy, preview: "View team data", url: "/admin/reports/team", perm: "reports_team", restrictLabel: "Admin only" },
    { id: "vendors", name: "Vendor Report", desc: "Vendor usage, cost contribution, and trip count", icon: Truck, preview: "View vendor data", url: "/admin/reports/vendors", perm: "reports_vendors", restrictLabel: "Admin only" },
    { id: "trip-operations", name: "Trip Operations", desc: "Upcoming trips, payment status, and stage pipeline", icon: Map, preview: "View trip operations", url: "/admin/reports/trip-operations", perm: "reports_trip_ops", restrictLabel: "Operations only" },
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
