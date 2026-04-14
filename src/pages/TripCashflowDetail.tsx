import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Pencil, Send, Zap } from "lucide-react";
import { formatINR } from "@/lib/formatINR";
import { formatLabel } from "@/lib/formatLabel";
import { format } from "date-fns";
import { sendWhatsAppMessage } from "@/services/aisensy";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted-foreground bg-muted/40",
  in_progress: "text-[hsl(var(--horizon))] bg-[hsl(var(--horizon))]/10",
  completed: "text-[hsl(var(--ridge))] bg-[hsl(var(--ridge))]/10",
  cancelled: "text-destructive bg-destructive/10",
};

const TripCashflowDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: cf, isLoading } = useQuery({
    queryKey: ["cashflow", id],
    queryFn: async () => { const { data, error } = await supabase.from("trip_cashflow").select("*").eq("id", id!).single(); if (error) throw error; return data; },
  });

  const { data: automationQueue = [] } = useQuery({
    queryKey: ["cashflow_automations", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("automation_queue" as any)
        .select("*, automation_templates(name, aisensy_template_name)")
        .eq("cashflow_id", id!)
        .order("scheduled_for");
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  const { data: vendorLines = [] } = useQuery({
    queryKey: ["cashflow_lines", id],
    queryFn: async () => { const { data } = await supabase.from("trip_cashflow_vendors").select("*").eq("cashflow_id", id!).order("sort_order"); return data || []; },
    enabled: !!id,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors_all_for_detail"],
    queryFn: async () => { const { data } = await supabase.from("vendors").select("id, name, nick_name"); return data || []; },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_all"],
    queryFn: async () => { const { data } = await supabase.from("destinations").select("id, name"); return data || []; },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  const gstRate = parseFloat(settings.find((s: any) => s.key === "gst_rate")?.value || "5");

  if (isLoading || !cf) return <AppLayout title="Cashflow"><div className="text-center py-12 text-sm text-muted-foreground">Loading...</div></AppLayout>;

  const getVendorName = (vid: string) => { const v = vendors.find((v: any) => v.id === vid); return v?.nick_name || v?.name || "—"; };
  const getDestName = (did: string) => destinations.find((d: any) => d.id === did)?.name || "—";

  const vendorCostPerPax = vendorLines.reduce((s: number, l: any) => s + parseFloat(l.cost_per_pax_incl_gst || 0), 0);
  const pax = cf.pax_count || 1;
  const totalVendorCost = vendorCostPerPax * pax;
  const marginPct = parseFloat(String(cf.margin_percent)) || 0;
  const marginAmount = totalVendorCost * (marginPct / 100);
  const sellingExGst = totalVendorCost + marginAmount;
  const gstAmount = cf.gst_billing ? sellingExGst * (gstRate / 100) : 0;
  const finalPrice = sellingExGst + gstAmount;

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const nights = cf.travel_start_date && cf.travel_end_date ? Math.ceil((new Date(cf.travel_end_date).getTime() - new Date(cf.travel_start_date).getTime()) / 86400000) : null;

  return (
    <AppLayout title={cf.cashflow_code}>
      <div className="flex items-center gap-2 text-sm mb-5">
        <button onClick={() => navigate("/trip-cashflow")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />Trip Cashflow
        </button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono font-medium text-primary">{cf.cashflow_code}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold">{cf.cashflow_code}</h1>
            <Badge variant="outline" className={`text-xs rounded-full capitalize ${STATUS_COLORS[cf.status || "draft"]}`}>
              {cf.status?.replace("_", " ")}
            </Badge>
            {cf.gst_billing ? <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200">GST</Badge> : <Badge variant="outline" className="text-[10px]">No GST</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{cf.traveller_name} · <span className="font-mono">{cf.traveller_code}</span></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => navigate(`/trip-cashflow/edit/${id}`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-5">
        {/* Left */}
        <div className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Trip Details</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ["Destination", cf.destination_id ? getDestName(cf.destination_id) : "—"],
                  ["Pax Count", String(cf.pax_count || 1)],
                  ["Travel Dates", `${fmtDate(cf.travel_start_date)} → ${fmtDate(cf.travel_end_date)}${nights ? ` · ${nights} nights` : ""}`],
                  ["Booking Date", fmtDate(cf.booking_date)],
                  ["Assigned To", cf.assigned_to || "—"],
                  ["Zoho Ref", cf.zoho_invoice_ref || "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium">{value as string}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Vendor Breakdown</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {vendorLines.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No vendor lines</p>
              ) : (
                <div className="border border-border/30 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/30 text-[10px] text-muted-foreground">
                        <th className="text-left px-3 py-2 font-medium">Service</th>
                        <th className="text-left px-3 py-2 font-medium">Vendor</th>
                        <th className="text-left px-3 py-2 font-medium">Description</th>
                        <th className="text-right px-3 py-2 font-medium">Cost/Pax</th>
                        <th className="text-right px-3 py-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorLines.map((l: any, i: number) => (
                        <tr key={i} className="border-t border-border/20 text-xs">
                          <td className="px-3 py-2"><Badge variant="secondary" className="text-[10px] rounded-md">{l.service_type}</Badge></td>
                          <td className="px-3 py-2">{l.vendor_id ? getVendorName(l.vendor_id) : "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{l.description || "—"}</td>
                          <td className="px-3 py-2 text-right">{formatINR(parseFloat(l.cost_per_pax_incl_gst))}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatINR(parseFloat(l.cost_per_pax_incl_gst) * pax)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-border/40 bg-muted/10">
                        <td colSpan={4} className="px-3 py-2 text-xs font-medium text-right">Subtotal</td>
                        <td className="px-3 py-2 text-right text-xs font-semibold">{formatINR(totalVendorCost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {cf.notes && (
            <Card className="border-border/50 shadow-none">
              <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Notes</CardTitle></CardHeader>
              <CardContent className="px-5 pb-4"><p className="text-xs whitespace-pre-wrap">{cf.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Right — Financial Summary */}
        <div>
          <Card className="border-[hsl(var(--ridge))]/20 shadow-none bg-[hsl(var(--ridge))]/5 sticky top-4">
            <CardContent className="p-5">
              <p className="text-sm font-semibold mb-4 flex items-center gap-1.5">💰 Financial Summary</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Revenue (ex-GST)</span><span className="font-medium">{formatINR(sellingExGst)}</span></div>
                <div className="flex justify-between text-sm"><span>Vendor Cost</span><span>{formatINR(totalVendorCost)}</span></div>
                <div className="border-t border-[hsl(var(--ridge))]/20 my-2" />
                <div className="flex justify-between text-sm font-semibold">
                  <span>Gross Profit</span>
                  <span className="text-[hsl(var(--ridge))]">{formatINR(marginAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Margin %</span>
                  <span className={marginPct > 15 ? "text-[hsl(var(--ridge))]" : marginPct >= 10 ? "text-[hsl(var(--horizon))]" : "text-destructive"}>
                    {marginPct.toFixed(1)}%
                  </span>
                </div>
                <div className="border-t border-[hsl(var(--ridge))]/20 my-2" />
                <div className="flex justify-between text-sm"><span>GST Collected ({gstRate}%)</span><span>{formatINR(gstAmount)}</span></div>
                <div className="border-t border-[hsl(var(--ridge))]/20 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Final Invoice</span>
                  <span className="text-[hsl(var(--ridge))]">{formatINR(finalPrice)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground text-right">Per person: {formatINR(pax > 0 ? finalPrice / pax : 0)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Automation Status */}
          {automationQueue.length > 0 && (
            <Card className="border-border/50 shadow-none mt-4">
              <CardHeader className="px-5 pt-4 pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />Automation Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 space-y-2">
                {automationQueue.map((item: any) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-yellow-100 text-yellow-700",
                    sent: "bg-ridge/20 text-ridge",
                    failed: "bg-destructive/20 text-destructive",
                    cancelled: "bg-muted text-muted-foreground",
                  };
                  const handleSendNow = async () => {
                    const tplName = item.automation_templates?.aisensy_template_name;
                    if (!tplName) { toast.error("Template not configured"); return; }
                    const result = await sendWhatsAppMessage(tplName, item.recipient_mobile, Array.isArray(item.variables) ? item.variables : [], "Adventourist");
                    await supabase.from("automation_queue" as any).update({
                      status: result.success ? "sent" : "failed",
                      aisensy_response: result.response,
                      attempts: (item.attempts || 0) + 1,
                      last_attempted_at: new Date().toISOString(),
                    }).eq("id", item.id);
                    queryClient.invalidateQueries({ queryKey: ["cashflow_automations", id] });
                    toast[result.success ? "success" : "error"](result.success ? "Message sent" : "Failed to send");
                  };
                  return (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium">{item.automation_templates?.name || formatLabel(item.trigger_event)}</span>
                        <span className="text-muted-foreground ml-2">{item.scheduled_for ? format(new Date(item.scheduled_for), "dd MMM, HH:mm") : ""}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] ${statusColors[item.status] || ""}`}>{formatLabel(item.status)}</Badge>
                        {(item.status === "pending" || item.status === "failed") && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleSendNow}>
                            <Send className="h-3 w-3 mr-1" />Send Now
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default TripCashflowDetail;
