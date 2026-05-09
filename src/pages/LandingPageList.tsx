import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, MoreHorizontal, Pencil, Eye, Copy, ToggleRight, Trash2, Layout, Download } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/formatINR";

const LandingPageList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [destFilter, setDestFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["landing_pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_pages").select("*, destinations(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: leadCounts = {} } = useQuery({
    queryKey: ["landing_page_lead_counts"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("landing_page_id");
      const counts: Record<string, number> = {};
      (data || []).forEach((l: any) => { if (l.landing_page_id) counts[l.landing_page_id] = (counts[l.landing_page_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => { const { data } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name"); return data || []; },
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["mv_platform"],
    queryFn: async () => { const { data } = await supabase.from("master_values").select("value").eq("type", "platform").eq("is_active", true); return data?.map((d: any) => d.value) || []; },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("landing_pages").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["landing_pages"] }); toast.success("Status updated"); setDeactivateId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("landing_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["landing_pages"] }); toast.success("Page deleted"); setDeleteId(null); },
  });

  const duplicatePage = async (page: any) => {
    const { id, destinations: _, created_at, published_at, ...rest } = page;
    const { error } = await supabase.from("landing_pages").insert({ ...rest, slug: rest.slug + "-copy", name: rest.name + " (Copy)", is_active: false, published_at: null });
    if (error) { toast.error("Duplicate failed"); return; }
    queryClient.invalidateQueries({ queryKey: ["landing_pages"] });
    toast.success("Page duplicated");
  };

  const filtered = pages.filter((p: any) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (destFilter !== "all" && p.destination_id !== destFilter) return false;
    if (platformFilter !== "all" && p.platform !== platformFilter) return false;
    if (statusFilter === "active" && !p.is_active) return false;
    if (statusFilter === "inactive" && p.is_active) return false;
    return true;
  });

  const activeCount = pages.filter((p: any) => p.is_active).length;

  return (
    <AppLayout title="Landing Pages">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Landing Pages</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{pages.length} pages · {activeCount} active</p>
        </div>
        <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/landing-pages/new")}>
          <Plus className="h-3.5 w-3.5 mr-1" />Create Landing Page
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pages..." className="pl-8 h-8 rounded-md text-xs" />
        </div>
        <Select value={destFilter} onValueChange={setDestFilter}>
          <SelectTrigger className="w-[150px] h-8 rounded-md text-xs"><SelectValue placeholder="Destination" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Destinations</SelectItem>
            {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[130px] h-8 rounded-md text-xs"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center border border-input rounded-md h-8 text-xs overflow-hidden">
          {["all", "active", "inactive"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 h-full capitalize transition-colors ${statusFilter === s ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}>
              {s}
            </button>
          ))}
        </div>
        {(search || destFilter !== "all" || platformFilter !== "all" || statusFilter !== "all") && (
          <button onClick={() => { setSearch(""); setDestFilter("all"); setPlatformFilter("all"); setStatusFilter("all"); }}
            className="text-xs text-primary hover:underline">Clear filters</button>
        )}
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="rounded-md text-xs h-8"><Download className="h-3.5 w-3.5 mr-1" />Export</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 && !isLoading ? (
        <div className="border-2 border-dashed border-border/50 rounded-lg py-16 text-center">
          <Layout className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No landing pages yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create your first campaign landing page</p>
          <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/landing-pages/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />Create Landing Page
          </Button>
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Page Name</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Destination</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Budget</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Attribution</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Leads</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-center px-3 py-2.5 font-medium text-muted-foreground w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => navigate(`/admin/landing-pages/edit/${p.id}`)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">/l/{p.slug}</p>
                  </td>
                  <td className="px-3 py-3">
                    {p.destinations?.name && <Badge variant="secondary" className="text-[10px] rounded-md font-normal">{p.destinations.name}</Badge>}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{p.budget ? formatINR(p.budget) : "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-0.5">
                      {p.platform && <Badge variant="outline" className="text-[10px] rounded-sm w-fit">{p.platform}</Badge>}
                      {p.channel && <Badge variant="outline" className="text-[10px] rounded-sm w-fit">{p.channel}</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {(leadCounts as any)[p.id] ? (
                      <Badge variant="secondary" className="text-[10px] rounded-md">{(leadCounts as any)[p.id]} leads</Badge>
                    ) : <span className="text-muted-foreground">0</span>}
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={`text-[10px] rounded-full font-normal ${p.is_active ? "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))] border-[hsl(var(--ridge))]/20" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="text-xs">
                        <DropdownMenuItem onClick={() => navigate(`/admin/landing-pages/edit/${p.id}`)}><Pencil className="h-3 w-3 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`https://www.adventourist.in/l/${p.slug}`, "_blank")}><Eye className="h-3 w-3 mr-2" />Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicatePage(p)}><Copy className="h-3 w-3 mr-2" />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { if (p.is_active) setDeactivateId(p.id); else toggleMutation.mutate({ id: p.id, active: true }); }}>
                          <ToggleRight className="h-3 w-3 mr-2" />{p.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDeleteId(p.id)} className="text-destructive"><Trash2 className="h-3 w-3 mr-2" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deactivate dialog */}
      <Dialog open={!!deactivateId} onOpenChange={() => setDeactivateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate this page?</DialogTitle>
            <DialogDescription>Deactivating this page will make it inaccessible. Any active ads pointing to this URL will stop working.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deactivateId && toggleMutation.mutate({ id: deactivateId, active: false })}>Deactivate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this page?</DialogTitle>
            <DialogDescription>This action cannot be undone. The page and all its data will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default LandingPageList;
