import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, ChevronDown, RefreshCw, Save, Globe, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/forms/ImageUploader";
import RichTextEditor from "@/components/forms/RichTextEditor";
import { useUnsavedChanges } from "@/components/forms/useUnsavedChanges";
import { useAutoSaveDraft } from "@/components/forms/useAutoSaveDraft";
import UnsavedChangesDialog from "@/components/forms/UnsavedChangesDialog";

const AUTHORS = ["Minal Joshi", "Pinky Prajapati", "Team Adventourist"];
const CATEGORIES: { value: string; label: string }[] = [
  { value: "travel-stories",     label: "Travel Stories" },
  { value: "things-to-do",       label: "Things To Do" },
  { value: "destination-guides", label: "Destination Guides" },
];

type StoryForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  author: string;
  category: string;
  tags: string[];
  destination_id: string | null;
  read_time_minutes: number;
  is_published: boolean;
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
};

const EMPTY: StoryForm = {
  title: "", slug: "", excerpt: "", content: "", cover_image_url: "",
  author: "Minal Joshi", category: "travel-stories", tags: [],
  destination_id: null, read_time_minutes: 5,
  is_published: false, published_at: null,
  seo_title: "", seo_description: "", og_image_url: "",
};

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const wordCount = (html: string) => {
  const t = stripHtml(html);
  return t ? t.split(/\s+/).length : 0;
};

const StoryEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [form, setForm] = useState<StoryForm>(EMPTY);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const [recordId, setRecordId] = useState<string | null>(isNew ? null : (id ?? null));

  const update = useCallback(<K extends keyof StoryForm>(key: K, value: StoryForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // Load existing story
  const { isLoading } = useQuery({
    queryKey: ["story", id],
    enabled: !isNew,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_stories" as any)
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        const loaded: StoryForm = mapRowToForm(data as any);
        setForm(loaded);
        resetSnapshot(loaded);
      }
      return data;
    },
  });

  function mapRowToForm(d: any): StoryForm {
    return {
      title: d.title || "",
      slug: d.slug || "",
      excerpt: d.excerpt || "",
      content: d.content_html || "",
      cover_image_url: d.thumbnail_url || "",
      author: d.author || "Minal Joshi",
      category: d.category || "travel-stories",
      tags: d.tags || [],
      destination_id: null,
      read_time_minutes: d.read_time_minutes ?? 5,
      is_published: d.status === "published",
      published_at: d.published_at || null,
      seo_title: d.seo_title || "",
      seo_description: d.seo_description || "",
      og_image_url: "",
    };
  }

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active_min"],
    queryFn: async () => {
      const { data } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { isDirty, blocker, markClean, resetSnapshot } = useUnsavedChanges(form, !isLoading);

  // Slug suggestion when title typed and slug still empty
  const suggestSlug = () => {
    if (!form.slug && form.title) update("slug", slugify(form.title));
  };

  // Tag chips
  const addTagsFromInput = () => {
    const parts = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const next = Array.from(new Set([...(form.tags || []), ...parts]));
    update("tags", next);
    setTagsInput("");
  };
  const removeTag = (t: string) => update("tags", form.tags.filter((x) => x !== t));

  const recalcReadTime = () => {
    const w = wordCount(form.content);
    update("read_time_minutes", Math.max(1, Math.ceil(w / 200)));
    toast.success(`Read time set from content (${w} words)`);
  };

  // Save (draft or publish)
  const persist = async (opts: { publish?: boolean; silent?: boolean } = {}) => {
    if (!form.title.trim()) {
      if (!opts.silent) toast.error("Title is required");
      return null;
    }
    if (!form.slug.trim()) {
      const s = slugify(form.title);
      update("slug", s);
      form.slug = s;
    }
    setSaving(true);
    try {
      const willPublish = opts.publish ?? form.is_published;
      const payload: Record<string, any> = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || null,
        content_html: form.content || null,
        thumbnail_url: form.cover_image_url || null,
        author: form.author,
        category: form.category,
        tags: form.tags,
        read_time_minutes: form.read_time_minutes || 1,
        status: willPublish ? "published" : "draft",
        published_at: willPublish && !form.published_at ? new Date().toISOString() : form.published_at,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      };

      let savedId = recordId;
      if (!savedId) {
        const { data, error } = await supabase.from("travel_stories" as any).insert(payload).select("id, published_at").single();
        if (error) throw error;
        savedId = (data as any).id;
        setRecordId(savedId);
        if (payload.published_at) update("published_at", payload.published_at);
        // swap URL to edit route without losing state
        window.history.replaceState(null, "", `/admin/stories/${savedId}/edit`);
      } else {
        const { error } = await supabase.from("travel_stories" as any).update(payload).eq("id", savedId);
        if (error) throw error;
      }

      const next: StoryForm = {
        ...form,
        is_published: willPublish,
        published_at: payload.published_at,
      };
      setForm(next);
      markClean(next);
      setLastSaved(new Date());
      if (!opts.silent) toast.success(opts.publish ? "Story published" : "Saved");
      return savedId;
    } catch (e: any) {
      const msg: string = e?.message || "Save failed";
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        toast.error("This slug is already taken — try another.");
      } else if (!opts.silent) {
        toast.error(msg);
      }
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Auto-save every 60s when dirty (silent)
  useAutoSaveDraft(async () => {
    if (!form.title.trim()) return;
    const ok = await persist({ silent: true });
    if (ok) toast("Draft auto-saved", { duration: 1500 });
  }, isDirty);

  const lastSavedLabel = useMemo(() => {
    if (!lastSaved) return "";
    const hh = String(lastSaved.getHours()).padStart(2, "0");
    const mm = String(lastSaved.getMinutes()).padStart(2, "0");
    return `Last saved ${hh}:${mm}`;
  }, [lastSaved]);

  const folder = recordId ?? "drafts";

  if (isLoading) {
    return (
      <AppLayout title="Edit Story">
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading story…
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isNew ? "New Story" : "Edit Story"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin/stories")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{isNew ? "New Story" : form.title || "Untitled story"}</h1>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <Badge className={`text-[10px] rounded-full font-normal ${form.is_published ? "bg-[hsl(var(--ridge))]/10 text-[hsl(var(--ridge))] border-[hsl(var(--ridge))]/20" : "bg-muted text-muted-foreground"}`}>
                {form.is_published ? "Published" : "Draft"}
              </Badge>
              {lastSavedLabel && <span>· {lastSavedLabel}</span>}
              {isDirty && <span className="text-amber-600">· Unsaved changes</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => persist()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Save Draft
          </Button>
          <Button size="sm" className="rounded-md text-xs" onClick={() => persist({ publish: true })} disabled={saving}>
            <Globe className="h-3.5 w-3.5 mr-1" />
            {form.is_published ? "Update" : "Publish"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* LEFT — editor */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          <div>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              onBlur={suggestSlug}
              placeholder="Story title"
              className="text-2xl font-display font-semibold h-14 rounded-md border-border/60"
              style={{ fontFamily: "'Inter Tight', Inter, sans-serif" }}
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">URL slug</Label>
            <div className="flex items-center border border-input rounded-md bg-background overflow-hidden">
              <span className="text-[11px] text-muted-foreground px-2.5 py-2 bg-muted/40 border-r border-input whitespace-nowrap">
                adventourist.in/travel-stories/
              </span>
              <Input
                value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                placeholder="my-story-slug"
                className="border-0 rounded-none h-9 text-xs focus-visible:ring-0"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">Excerpt</Label>
              <span className={`text-[10px] ${form.excerpt.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                {form.excerpt.length}/200
              </span>
            </div>
            <Textarea
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value.slice(0, 200))}
              placeholder="A short teaser shown on cards and previews."
              rows={3}
              className="rounded-md text-sm"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Cover image</Label>
            <ImageUploader
              bucket="stories"
              folder={folder}
              filename="cover"
              value={form.cover_image_url}
              onChange={(url) => update("cover_image_url", url)}
              previewClassName="w-full h-56 object-cover rounded-lg"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Content</Label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => update("content", html)}
              placeholder="Tell the story…"
              minHeight={480}
              enableMedia
              imageBucket="stories"
              imageFolder={`${folder}/inline`}
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {wordCount(form.content)} words · ~{Math.max(1, Math.ceil(wordCount(form.content) / 200))} min read
            </p>
          </div>
        </div>

        {/* RIGHT — settings */}
        <aside className="col-span-12 lg:col-span-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Status segmented */}
            <div className="border border-border/50 rounded-lg p-3.5">
              <Label className="text-xs text-muted-foreground mb-2 block">Status</Label>
              <div className="flex items-center border border-input rounded-md h-9 text-xs overflow-hidden">
                <button
                  className={`flex-1 h-full transition-colors ${!form.is_published ? "bg-muted text-foreground font-medium" : "hover:bg-muted/40"}`}
                  onClick={() => update("is_published", false)}
                >Draft</button>
                <button
                  className={`flex-1 h-full transition-colors ${form.is_published ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/40"}`}
                  onClick={() => {
                    update("is_published", true);
                    if (!form.published_at) update("published_at", new Date().toISOString());
                  }}
                >Published</button>
              </div>
              {form.published_at && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  First published {new Date(form.published_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              )}
            </div>

            <div className="border border-border/50 rounded-lg p-3.5 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Author</Label>
                <Select value={form.author} onValueChange={(v) => update("author", v)}>
                  <SelectTrigger className="h-8 rounded-md text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUTHORS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
                <Select value={form.category} onValueChange={(v) => update("category", v)}>
                  <SelectTrigger className="h-8 rounded-md text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Destination (optional)</Label>
                <Select
                  value={form.destination_id ?? "__none__"}
                  onValueChange={(v) => update("destination_id", v === "__none__" ? null : v)}
                >
                  <SelectTrigger className="h-8 rounded-md text-xs"><SelectValue placeholder="— None —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {(destinations as any[]).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Tags</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTagsFromInput();
                    }
                  }}
                  onBlur={addTagsFromInput}
                  placeholder="bali, beaches, romantic"
                  className="h-8 rounded-md text-xs"
                />
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full"
                      >
                        {t}
                        <button onClick={() => removeTag(t)} className="hover:text-primary/70">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Read time (minutes)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    value={form.read_time_minutes}
                    onChange={(e) => update("read_time_minutes", Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 rounded-md text-xs w-24"
                  />
                  <Button variant="outline" size="sm" className="h-8 rounded-md text-xs" onClick={recalcReadTime}>
                    <RefreshCw className="h-3 w-3 mr-1" />Auto
                  </Button>
                </div>
              </div>
            </div>

            {/* SEO */}
            <Collapsible open={seoOpen} onOpenChange={setSeoOpen} className="border border-border/50 rounded-lg">
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-medium hover:bg-muted/30">
                <span>SEO & Social</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${seoOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-3.5 pb-3.5 space-y-3 border-t border-border/40">
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">SEO title</Label>
                    <span className={`text-[10px] ${form.seo_title.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                      {form.seo_title.length}/60
                    </span>
                  </div>
                  <Input
                    value={form.seo_title}
                    onChange={(e) => update("seo_title", e.target.value.slice(0, 60))}
                    placeholder="Defaults to story title"
                    className="h-8 rounded-md text-xs"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">SEO description</Label>
                    <span className={`text-[10px] ${form.seo_description.length > 155 ? "text-destructive" : "text-muted-foreground"}`}>
                      {form.seo_description.length}/155
                    </span>
                  </div>
                  <Textarea
                    value={form.seo_description}
                    onChange={(e) => update("seo_description", e.target.value.slice(0, 155))}
                    rows={3}
                    className="rounded-md text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">OG image</Label>
                  <ImageUploader
                    bucket="stories"
                    folder={folder}
                    filename="og"
                    value={form.og_image_url}
                    onChange={(url) => update("og_image_url", url)}
                    previewClassName="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </aside>
      </div>

      <UnsavedChangesDialog blocker={blocker} />
    </AppLayout>
  );
};

export default StoryEdit;