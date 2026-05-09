import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, ChevronRight, Pencil, Ban, Phone, Mail, MessageCircle, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface ContactPoint {
  name?: string; mobile?: string; email?: string; role?: string;
  alt_mobile?: string; alt_email?: string;
}

const formatINR = (n: number | null | undefined) => {
  if (!n) return "₹0";
  return "₹" + n.toLocaleString("en-IN");
};

const VendorDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmInactive, setConfirmInactive] = useState(false);

  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_all"],
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: trips = [] } = useQuery({
    queryKey: ["vendor_trips", id],
    queryFn: async () => {
      // Get cashflow IDs where this vendor has lines
      const { data: vendorLines } = await supabase.from("trip_cashflow_vendors").select("cashflow_id").eq("vendor_id", id!);
      if (!vendorLines || vendorLines.length === 0) return [];
      const cashflowIds = [...new Set(vendorLines.map((v: any) => v.cashflow_id))];
      const { data } = await supabase.from("trip_cashflow").select("*").in("id", cashflowIds).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("vendors").update({ is_active: !vendor?.is_active }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      toast.success("Vendor status updated");
      setConfirmInactive(false);
    },
  });

  if (isLoading || !vendor) return <AppLayout title="Vendor"><div className="text-center py-12 text-sm text-muted-foreground">Loading...</div></AppLayout>;

  const getDestName = (destId: string) => destinations.find((d: any) => d.id === destId)?.name || destId;
  const contacts = (Array.isArray(vendor.contact_points) ? vendor.contact_points : []) as ContactPoint[];
  const totalVendorCost = trips.reduce((sum: number, t: any) => sum + (t.total_vendor_cost || 0), 0);
  const maskedPan = vendor.pan ? vendor.pan.slice(0, 5) + "****" + vendor.pan.slice(9) : "—";

  return (
    <AppLayout title={vendor.name}>
      {/* Header */}
      <div className="flex items-center gap-2 text-sm mb-5">
        <button onClick={() => navigate("/admin/vendors")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />Vendors
        </button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-medium">{vendor.vendor_code}</span>
      </div>

      <div className="flex items-start gap-6 mb-6">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shrink-0">
          {vendor.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-foreground">{vendor.name}</h1>
          {vendor.nick_name && <p className="text-sm text-muted-foreground">{vendor.nick_name}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="outline" className="font-mono text-xs text-primary">{vendor.vendor_code}</Badge>
            <Badge variant="outline" className={`text-[10px] rounded-full ${vendor.is_active ? "border-[hsl(var(--ridge))]/30 text-[hsl(var(--ridge))] bg-[hsl(var(--ridge))]/10" : "text-muted-foreground"}`}>
              {vendor.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => navigate(`/admin/vendors/edit/${id}`)}>
            <Pencil className="h-3.5 w-3.5 mr-1" />Edit Vendor
          </Button>
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => setConfirmInactive(true)}>
            <Ban className="h-3.5 w-3.5 mr-1" />{vendor.is_active ? "Mark Inactive" : "Mark Active"}
          </Button>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-[300px_1fr] gap-5">
        {/* Left */}
        <div className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Service Info</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Destinations Served</p>
                <div className="flex flex-wrap gap-1">
                  {(vendor.serve_destinations || []).map((d: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] rounded-md bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0">{getDestName(d)}</Badge>
                  ))}
                  {(vendor.serve_destinations || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Services Offered</p>
                <div className="flex flex-wrap gap-1">
                  {(vendor.services || []).map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] rounded-md">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Vendor Since</p>
                <p className="text-xs">{vendor.created_at ? new Date(vendor.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-4 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Contact Points</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {contacts.length === 0 && <p className="text-xs text-muted-foreground">No contacts added</p>}
              {contacts.map((cp, idx) => (
                <div key={idx} className="p-3 bg-muted/20 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{cp.name || "Unnamed"}</p>
                    {cp.role && <Badge variant="outline" className="text-[10px] rounded-md">{cp.role}</Badge>}
                  </div>
                  {cp.mobile && (
                    <a href={`tel:${cp.mobile}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Phone className="h-3 w-3" />{cp.mobile}
                    </a>
                  )}
                  {cp.email && (
                    <a href={`mailto:${cp.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                      <Mail className="h-3 w-3" />{cp.email}
                    </a>
                  )}
                  {cp.mobile && (
                    <a href={`https://wa.me/${cp.mobile.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors mt-1">
                      <MessageCircle className="h-2.5 w-2.5" />WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-4">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Bank & Compliance</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ["Bank Name", vendor.bank_name],
                  ["A/C Number", vendor.bank_account],
                  ["IFSC", vendor.bank_ifsc],
                  ["SWIFT", vendor.bank_swift],
                  ["MICR", vendor.bank_micr],
                  ["PAN", maskedPan],
                  ["GST", vendor.gst || "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-medium">{(value as string) || "—"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">Trip History</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {trips.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No trips assigned yet</p>
              ) : (
                <>
                  <div className="border border-border/30 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/30 text-[10px] text-muted-foreground">
                          <th className="text-left px-3 py-2 font-medium">Trip Code</th>
                          <th className="text-left px-3 py-2 font-medium">Destination</th>
                          <th className="text-left px-3 py-2 font-medium">Travel Dates</th>
                          <th className="text-right px-3 py-2 font-medium">Pax</th>
                          <th className="text-right px-3 py-2 font-medium">Vendor Cost</th>
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trips.map((t: any) => (
                          <tr key={t.id} className="border-t border-border/20 text-xs">
                            <td className="px-3 py-2 font-mono text-primary">{t.traveller_code || "—"}</td>
                            <td className="px-3 py-2">{t.destination_id ? getDestName(t.destination_id) : "—"}</td>
                            <td className="px-3 py-2">{t.travel_start_date || "—"}</td>
                            <td className="px-3 py-2 text-right">{t.pax_count || 0}</td>
                            <td className="px-3 py-2 text-right">{formatINR(t.total_vendor_cost)}</td>
                            <td className="px-3 py-2">
                              <Badge variant="outline" className="text-[10px] rounded-md">{t.status || "active"}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-right">
                    {trips.length} trip{trips.length !== 1 ? "s" : ""} · {formatINR(totalVendorCost)} total vendor cost
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmInactive} onOpenChange={setConfirmInactive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {vendor.name} as {vendor.is_active ? "inactive" : "active"}?</DialogTitle>
            <DialogDescription>
              {vendor.is_active ? "They will no longer appear in Trip Cashflow dropdowns." : "They will appear again in Trip Cashflow dropdowns."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmInactive(false)}>Cancel</Button>
            <Button variant={vendor.is_active ? "destructive" : "default"} onClick={() => toggleMutation.mutate()}>
              {vendor.is_active ? "Mark Inactive" : "Mark Active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default VendorDetail;
