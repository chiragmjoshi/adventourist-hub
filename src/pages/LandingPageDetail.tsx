import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Pencil, ExternalLink, Users, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { formatINR } from "@/lib/formatINR";

const LandingPageDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: page } = useQuery({
    queryKey: ["landing_page", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_pages").select("*, destinations(name)").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["landing_page_leads", id],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id, name, traveller_code, created_at, sales_status").eq("landing_page_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: cashflows = [] } = useQuery({
    queryKey: ["landing_page_cashflows", id],
    queryFn: async () => {
      const leadIds = leads.map(l => l.id);
      if (leadIds.length === 0) return [];
      const { data } = await supabase.from("trip_cashflow").select("id, lead_id, margin_percent, status").in("lead_id", leadIds);
      return data || [];
    },
    enabled: leads.length > 0,
  });

  if (!page) return <AppLayout title="Loading..."><div className="text-sm text-muted-foreground">Loading...</div></AppLayout>;

  const now = new Date();
  const thisMonth = leads.filter(l => { const d = new Date(l.created_at!); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const closedLeads = leads.filter(l => l.sales_status === "file_closed");
  const conversionRate = leads.length > 0 ? ((closedLeads.length / leads.length) * 100).toFixed(1) : "0";

  return (
    <AppLayout title={page.name}>
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/landing-pages")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Landing Pages
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{page.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => navigate(`/landing-pages/edit/${id}`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit Page
          </Button>
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => window.open(`https://www.adventourist.in/l/${page.slug}`, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5 mr-1" />View Live
          </Button>
        </div>
      </div>

      {/* Header info */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="text-lg font-semibold">{page.name}</h1>
        {page.destinations?.name && <Badge variant="secondary" className="text-xs rounded-md">{page.destinations.name}</Badge>}
        <Badge className={`text-[10px] rounded-full ${page.is_active ? "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))]" : "bg-muted text-muted-foreground"}`}>
          {page.is_active ? "Active" : "Inactive"}
        </Badge>
        {page.published_at && <span className="text-[10px] text-muted-foreground">Published {new Date(page.published_at).toLocaleDateString()}</span>}
      </div>

      {/* Attribution pills */}
      <div className="flex gap-2 mb-5">
        {[["Platform", page.platform], ["Channel", page.channel], ["Campaign", page.campaign_type], ["Ad Group", page.ad_group]].map(([label, val]) =>
          val ? <Badge key={label} variant="outline" className="text-[10px] rounded-md">{label}: {val}</Badge> : null
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: leads.length, icon: Users },
          { label: "Leads This Month", value: thisMonth.length, icon: Calendar },
          { label: "Conversion Rate", value: `${conversionRate}%`, icon: TrendingUp },
          { label: "Closed Leads", value: closedLeads.length, icon: DollarSign },
        ].map(s => (
          <Card key={s.label} className="border-border/50 shadow-none">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-semibold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads table */}
      <Card className="border-border/50 shadow-none">
        <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Leads from this Page</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          {leads.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No leads from this page yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 font-medium text-muted-foreground">Code</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td className="py-2 font-mono text-primary">{l.traveller_code}</td>
                    <td className="py-2">{l.name}</td>
                    <td className="py-2 text-muted-foreground">{new Date(l.created_at!).toLocaleDateString()}</td>
                    <td className="py-2"><Badge variant="outline" className="text-[10px] rounded-sm capitalize">{l.sales_status?.replace(/_/g, " ")}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default LandingPageDetail;
