import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Upload, Compass, MoreHorizontal, Eye, Pencil, Ban, Trash2 } from "lucide-react";
import { toast } from "sonner";

type ContactPoint = { name?: string; mobile?: string; email?: string; role?: string };

const VendorList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [destFilter, setDestFilter] = useState<string[]>([]);
  const [serviceFilter, setServiceFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortBy, setSortBy] = useState("recent");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; vendor: any | null }>({ open: false, vendor: null });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
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

  const { data: serviceTypes = [] } = useQuery({
    queryKey: ["mv_service_type"],
    queryFn: async () => {
      const { data } = await supabase.from("master_values").select("value").eq("type", "service_type").eq("is_active", true).order("sort_order");
      return data?.map((d: any) => d.value) || [];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("vendors").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor status updated");
      setConfirmDialog({ open: false, vendor: null });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vendors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("Vendor deleted");
    },
  });

  // Filter & sort
  let filtered = vendors.filter((v: any) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase()) && !(v.nick_name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter === "active" && !v.is_active) return false;
    if (statusFilter === "inactive" && v.is_active) return false;
    if (destFilter.length > 0 && !(v.serve_destinations || []).some((d: string) => destFilter.includes(d))) return false;
    if (serviceFilter.length > 0 && !(v.services || []).some((s: string) => serviceFilter.includes(s))) return false;
    return true;
  });

  if (sortBy === "name_asc") filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));
  else if (sortBy === "name_desc") filtered.sort((a: any, b: any) => b.name.localeCompare(a.name));

  const activeCount = vendors.filter((v: any) => v.is_active).length;
  const filtersActive = search || destFilter.length || serviceFilter.length || statusFilter !== "all" || sortBy !== "recent";

  const getDestName = (id: string) => destinations.find((d: any) => d.id === id)?.name || null;
  const getPrimaryContact = (cp: any): ContactPoint => {
    if (!cp) return {};
    const arr = Array.isArray(cp) ? cp : [];
    return arr[0] || {};
  };

  return (
    <AppLayout title="Vendor Management">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Vendor Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{vendors.length} vendors · {activeCount} active</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md text-xs">
            <Upload className="h-3.5 w-3.5 mr-1" />Import CSV
          </Button>
          <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/vendors/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Vendor
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 py-3 border-b border-border/40 mb-4">
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..." className="pl-8 h-8 rounded-md text-xs" />
        </div>
        <Select value={destFilter[0] || "_all"} onValueChange={v => setDestFilter(v === "_all" ? [] : [v])}>
          <SelectTrigger className="h-8 text-xs w-[140px] rounded-md"><SelectValue placeholder="Destination" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Destinations</SelectItem>
            {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter[0] || "_all"} onValueChange={v => setServiceFilter(v === "_all" ? [] : [v])}>
          <SelectTrigger className="h-8 text-xs w-[140px] rounded-md"><SelectValue placeholder="Service Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Services</SelectItem>
            {serviceTypes.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex bg-muted/40 rounded-md p-0.5">
          {(["all", "active", "inactive"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${statusFilter === s ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {s}
            </button>
          ))}
        </div>
        <Select value={sortBy} onValueChange={v => setSortBy(v)}>
          <SelectTrigger className="h-8 text-xs w-[140px] rounded-md"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently Added</SelectItem>
            <SelectItem value="name_asc">Name A-Z</SelectItem>
            <SelectItem value="name_desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
        {filtersActive && (
          <button onClick={() => { setSearch(""); setDestFilter([]); setServiceFilter([]); setStatusFilter("all"); setSortBy("recent"); }}
            className="text-xs text-primary hover:underline ml-1">Clear filters</button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading vendors...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/40 shadow-none">
          <CardContent className="py-16 text-center">
            <Compass className="h-12 w-12 mx-auto text-primary/60 mb-3" />
            <p className="text-base font-medium text-foreground mb-1">No vendors yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add your first vendor to get started</p>
            <Button size="sm" onClick={() => navigate("/admin/vendors/new")} className="rounded-md">
              <Plus className="h-3.5 w-3.5 mr-1" />Add Vendor
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-border/40 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Vendor</th>
                <th className="text-left px-4 py-2.5 font-medium">Code</th>
                <th className="text-left px-4 py-2.5 font-medium">Destinations</th>
                <th className="text-left px-4 py-2.5 font-medium">Services</th>
                <th className="text-left px-4 py-2.5 font-medium">Primary Contact</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-right px-4 py-2.5 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v: any) => {
                const pc = getPrimaryContact(v.contact_points);
                const dests = ((v.serve_destinations || []) as string[]).filter((d) => !!getDestName(d));
                const svcs = (v.services || []) as string[];
                return (
                  <tr key={v.id} onClick={() => navigate(`/admin/vendors/${v.id}`)}
                    className="border-t border-border/30 hover:bg-muted/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{v.name}</p>
                      {v.nick_name && <p className="text-xs text-muted-foreground">{v.nick_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary">{v.vendor_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {dests.slice(0, 2).map((d, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] rounded-md bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0">
                            {getDestName(d)}
                          </Badge>
                        ))}
                        {dests.length > 2 && <Badge variant="outline" className="text-[10px] rounded-md">+{dests.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {svcs.slice(0, 2).map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] rounded-md">{s}</Badge>
                        ))}
                        {svcs.length > 2 && <Badge variant="outline" className="text-[10px] rounded-md">+{svcs.length - 2}</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {pc.name ? (
                        <div>
                          <p className="text-xs text-foreground">{pc.name}</p>
                          <p className="text-[11px] text-muted-foreground">{pc.mobile}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] rounded-full px-2 ${v.is_active ? "border-[hsl(var(--ridge))]/30 text-[hsl(var(--ridge))] bg-[hsl(var(--ridge))]/10" : "text-muted-foreground"}`}>
                        {v.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => navigate(`/admin/vendors/${v.id}`)}><Eye className="h-3.5 w-3.5 mr-2" />View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/admin/vendors/edit/${v.id}`)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setConfirmDialog({ open: true, vendor: v })}>
                            <Ban className="h-3.5 w-3.5 mr-2" />{v.is_active ? "Mark Inactive" : "Mark Active"}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm("Delete this vendor?")) deleteMutation.mutate(v.id); }}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={o => !o && setConfirmDialog({ open: false, vendor: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {confirmDialog.vendor?.name} as {confirmDialog.vendor?.is_active ? "inactive" : "active"}?</DialogTitle>
            <DialogDescription>
              {confirmDialog.vendor?.is_active
                ? "They will no longer appear in Trip Cashflow dropdowns."
                : "They will appear in Trip Cashflow dropdowns again."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, vendor: null })}>Cancel</Button>
            <Button variant={confirmDialog.vendor?.is_active ? "destructive" : "default"}
              onClick={() => confirmDialog.vendor && toggleMutation.mutate({ id: confirmDialog.vendor.id, is_active: !confirmDialog.vendor.is_active })}>
              {confirmDialog.vendor?.is_active ? "Mark Inactive" : "Mark Active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default VendorList;
