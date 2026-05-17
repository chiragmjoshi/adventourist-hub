import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Eye, BookOpen, ImageOff } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "travel-stories",     label: "Travel Stories" },
  { value: "things-to-do",       label: "Things To Do" },
  { value: "destination-guides", label: "Destination Guides" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const StoryList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ["stories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_stories" as any)
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((s) => ({
        ...s,
        is_published: s.status === "published",
        cover_image_url: s.thumbnail_url,
      }));
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, publish, hadPublishedAt }: { id: string; publish: boolean; hadPublishedAt: boolean }) => {
      const patch: Record<string, any> = { status: publish ? "published" : "draft" };
      if (publish && !hadPublishedAt) patch.published_at = new Date().toISOString();
      const { error } = await supabase.from("travel_stories" as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success(vars.publish ? "Story published" : "Moved to drafts");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("travel_stories" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      toast.success("Story deleted");
      setDeleteId(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
  });

  const filtered = stories.filter((s) => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.title?.toLowerCase().includes(q) && !s.excerpt?.toLowerCase().includes(q)) return false;
    }
    if (category !== "all" && s.category !== category) return false;
    if (status === "published" && !s.is_published) return false;
    if (status === "draft" && s.is_published) return false;
    return true;
  });

  const publishedCount = stories.filter((s) => s.is_published).length;

  return (
    <AppLayout title="Stories">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Stories</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stories.length} stories · {publishedCount} published
          </p>
        </div>
        <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/stories/new")}>
          <Plus className="h-3.5 w-3.5 mr-1" />New Story
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stories…"
            className="pl-8 h-8 rounded-md text-xs"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px] h-8 rounded-md text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center border border-input rounded-md h-8 text-xs overflow-hidden">
          {(["all", "published", "draft"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 h-full capitalize transition-colors ${status === s ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"}`}
            >
              {s}
            </button>
          ))}
        </div>
        {(search || category !== "all" || status !== "all") && (
          <button
            onClick={() => { setSearch(""); setCategory("all"); setStatus("all"); }}
            className="text-xs text-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty state */}
      {!isLoading && stories.length === 0 ? (
        <div className="border-2 border-dashed border-border/50 rounded-lg py-16 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No stories yet</p>
          <p className="text-xs text-muted-foreground mb-4">Create your first one.</p>
          <Button size="sm" className="rounded-md text-xs" onClick={() => navigate("/admin/stories/new")}>
            <Plus className="h-3.5 w-3.5 mr-1" />New Story
          </Button>
        </div>
      ) : !isLoading && filtered.length === 0 ? (
        <div className="border border-border/50 rounded-lg py-12 text-center text-xs text-muted-foreground">
          No stories match your filters.
        </div>
      ) : (
        <div className="border border-border/50 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Title</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Author</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Views</th>
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Published</th>
                <th className="text-right px-3 py-2.5 font-medium text-muted-foreground w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                  onClick={() => navigate(`/admin/stories/${s.id}/edit`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-14 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {s.cover_image_url
                          ? <img src={s.cover_image_url} alt="" className="h-full w-full object-cover" />
                          : <ImageOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{s.title}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">/travel-stories/{s.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {s.category && (
                      <Badge variant="secondary" className="text-[10px] rounded-md font-normal">{CATEGORY_LABEL[s.category] ?? s.category}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{s.author || "—"}</td>
                  <td className="px-3 py-3">
                    <Badge
                      className={`text-[10px] rounded-full font-normal ${
                        s.is_published
                          ? "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))] border-[hsl(var(--ridge))]/20"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.is_published ? "Published" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3 w-3" />{s.views ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.published_at ? new Date(s.published_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Switch
                        checked={!!s.is_published}
                        onCheckedChange={(v) => togglePublishMutation.mutate({
                          id: s.id, publish: v, hadPublishedAt: !!s.published_at,
                        })}
                        title={s.is_published ? "Unpublish" : "Publish"}
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/admin/stories/${s.id}/edit`)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this story?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The story and its settings will be permanently removed.
            </DialogDescription>
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

export default StoryList;