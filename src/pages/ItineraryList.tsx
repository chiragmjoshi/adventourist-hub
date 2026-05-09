import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, RotateCcw, Map, MoreHorizontal, Pencil, Eye, Copy, Archive } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  published: "bg-green-50 text-green-700 border-green-200",
  archived: "bg-muted text-muted-foreground border-border",
};

const ItineraryList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterDest, setFilterDest] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const { data: itineraries = [], isLoading } = useQuery({
    queryKey: ["itineraries"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itineraries")
        .select("*, destinations(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    return itineraries.filter((it: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!it.headline?.toLowerCase().includes(q) && !it.slug?.toLowerCase().includes(q)) return false;
      }
      if (filterDest !== "all" && it.destination_id !== filterDest) return false;
      if (filterStatus !== "all") {
        if (it.status !== filterStatus) return false;
      } else {
        // Default view hides archived itineraries
        if (it.status === "archived") return false;
      }
      return true;
    });
  }, [itineraries, search, filterDest, filterStatus]);

  const handlePreview = (it: any) => {
    if (it.slug) window.open(`/preview/itineraries/${it.slug}`, "_blank");
    else toast.error("This itinerary has no slug to preview");
  };

  const handleDuplicate = async (it: any) => {
    const { id, created_at, published_at, ...rest } = it as any;
    const copy = {
      ...rest,
      headline: `${it.headline} (Copy)`,
      slug: `${it.slug || "itinerary"}-copy-${Date.now().toString(36)}`,
      status: "draft",
      published_at: null,
    };
    delete (copy as any).destinations;
    const { error } = await supabase.from("itineraries").insert(copy);
    if (error) { toast.error(error.message); return; }
    toast.success("Itinerary duplicated");
    queryClient.invalidateQueries({ queryKey: ["itineraries"] });
  };

  const handleArchive = async (it: any) => {
    const newStatus = it.status === "archived" ? "draft" : "archived";
    const { error } = await supabase.from("itineraries").update({ status: newStatus }).eq("id", it.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "archived" ? "Itinerary archived" : "Itinerary restored");
    queryClient.invalidateQueries({ queryKey: ["itineraries"] });
  };

  return (
    <AppLayout title="Itineraries">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Itineraries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} itineraries</p>
        </div>
        <Button onClick={() => navigate("/itineraries/new")} className="rounded-md">
          <Plus className="h-4 w-4 mr-1.5" />Add Itinerary
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-5 border-border/50 shadow-none">
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Select value={filterDest} onValueChange={setFilterDest}>
            <SelectTrigger className="h-8 text-xs w-[150px] rounded-md border-border/60"><SelectValue placeholder="Destination" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Destinations</SelectItem>
              {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-[120px] rounded-md border-border/60"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {(filterDest !== "all" || filterStatus !== "all") && (
            <button onClick={() => { setFilterDest("all"); setFilterStatus("all"); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 ml-1">
              <RotateCcw className="h-3 w-3" />Reset
            </button>
          )}
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search itineraries..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-56 text-xs rounded-md border-border/60" />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {filtered.length === 0 && !isLoading ? (
        <Card className="border-border/50 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Map className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No itineraries yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first travel itinerary</p>
            <Button onClick={() => navigate("/itineraries/new")}><Plus className="h-4 w-4 mr-1.5" />Add Itinerary</Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-none overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-12" />
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Title</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Destination</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Duration</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Budget</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Best Time</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.map((it: any) => (
                <TableRow key={it.id} className="hover:bg-[#F9FAFB] transition-colors duration-150 border-b border-border/30 cursor-pointer"
                  onClick={() => navigate(`/itineraries/edit/${it.id}`)}>
                  <TableCell className="py-3">
                    {it.hero_image ? (
                      <img src={it.hero_image} alt="" className="w-10 h-10 rounded-md object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center"><Map className="h-4 w-4 text-muted-foreground" /></div>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-[13px] font-medium text-foreground">{it.headline}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    {it.destinations?.name ? (
                      <Badge variant="secondary" className="text-[11px] bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0 rounded-md">
                        {it.destinations.name}
                      </Badge>
                    ) : <span className="text-[13px] text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-muted-foreground">
                    {it.nights && it.days ? `${it.nights}N ${it.days}D` : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-[13px] text-foreground">
                    {it.price_per_person ? `₹${it.price_per_person.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[12px] text-muted-foreground">
                          {it.best_months?.length > 0
                            ? it.best_months.slice(0, 3).join(", ") + (it.best_months.length > 3 ? ` +${it.best_months.length - 3}` : "")
                            : "—"}
                        </span>
                      </TooltipTrigger>
                      {it.best_months?.length > 3 && <TooltipContent>{it.best_months.join(", ")}</TooltipContent>}
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant="outline" className={`text-[10px] font-medium rounded-md ${STATUS_STYLE[it.status] || STATUS_STYLE.draft}`}>
                      {it.status || "draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/itineraries/edit/${it.id}`)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePreview(it)}><Eye className="h-3.5 w-3.5 mr-2" />Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(it)}><Copy className="h-3.5 w-3.5 mr-2" />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleArchive(it)}>
                          <Archive className="h-3.5 w-3.5 mr-2" />{it.status === "archived" ? "Unarchive" : "Archive"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </AppLayout>
  );
};

export default ItineraryList;
