import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ChevronRight, Save, Globe, Plus, GripVertical, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import StepProgress from "@/components/forms/StepProgress";
import StepNav from "@/components/forms/StepNav";
import ImageUploader from "@/components/forms/ImageUploader";
import MultiImageUploader from "@/components/forms/MultiImageUploader";
import RichTextEditor from "@/components/forms/RichTextEditor";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsToNames = (nums: any): string[] =>
  Array.isArray(nums) ? nums.map((n: any) => MONTHS[Number(n) - 1]).filter(Boolean) : [];
const monthsToNums = (names: string[]): number[] =>
  names.map((m) => MONTHS.indexOf(m) + 1).filter((n) => n >= 1);

const INCLUSIONS = [
  { key: "flights_included", label: "Flights Included" },
  { key: "transfers_included", label: "Transfers Included" },
  { key: "meals_included", label: "All Meals Included" },
  { key: "stay_included", label: "Stay Included" },
  { key: "breakfast_included", label: "Breakfast Included" },
  { key: "sightseeing_included", label: "Sightseeing Included" },
  { key: "support_247", label: "24/7 Support" },
];

interface DayPlan {
  day: number;
  title: string;
  description: string;
  activities: string[];
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean };
  accommodation: string;
}

const ItineraryEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const autoSaveTimer = useRef<ReturnType<typeof setInterval>>();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const STEPS = [
    { key: "summary", label: "Trip Summary" },
    { key: "media", label: "Media" },
    { key: "details", label: "Itinerary Details" },
    { key: "dayplan", label: "Day-by-Day Plan" },
    { key: "seo", label: "SEO Data" },
  ];
  const [activeTab, setActiveTab] = useState<string>("summary");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const stepIdx = STEPS.findIndex(s => s.key === activeTab);
  const goTo = (key: string) => {
    setActiveTab(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = () => {
    setCompletedSteps(prev => new Set(prev).add(activeTab));
    if (stepIdx < STEPS.length - 1) goTo(STEPS[stepIdx + 1].key);
  };
  const goBack = () => { if (stepIdx > 0) goTo(STEPS[stepIdx - 1].key); };

  const [form, setForm] = useState<Record<string, any>>({
    headline: "", slug: "", about: "", destination_id: "", days: null, nights: null,
    price_per_person: null, best_months: [] as string[], themes: [] as string[],
    suitable_for: [] as string[], destination_type: "", status: "draft",
    flights_included: false, stay_included: false, transfers_included: false,
    meals_included: false, breakfast_included: false, sightseeing_included: false,
    support_247: false, hero_image: "", gallery: [] as string[],
    highlights: [] as string[], inclusions: "", exclusions: "",
    itinerary_days: [] as DayPlan[], important_notes: "",
    seo_title: "", seo_description: "", seo_keywords: "", _galleryInput: "",
  });

  const [highlightInput, setHighlightInput] = useState("");
  const [seoKeywordInput, setSeoKeywordInput] = useState("");

  /* ── Queries ── */
  const { data: existing } = useQuery({
    queryKey: ["itinerary", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("itineraries").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, about, best_months, themes, suitable_for, hero_image")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("master_values").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const mvByType = (type: string) => masterValues.filter((v: any) => v.type === type);

  // Load existing data
  useEffect(() => {
    if (existing) {
      // Defensive: itinerary_days may come back as an array OR a JSON string
      let rawDays: any = existing.itinerary_days;
      if (typeof rawDays === "string") {
        try { rawDays = JSON.parse(rawDays); } catch { rawDays = []; }
      }
      if (!Array.isArray(rawDays)) rawDays = [];
      setForm({
        headline: existing.headline || "",
        slug: existing.slug || "",
        about: existing.about || "",
        destination_id: existing.destination_id || "",
        days: existing.days,
        nights: existing.nights,
        price_per_person: existing.price_per_person,
        best_months: monthsToNames(existing.best_months),
        themes: existing.themes || [],
        suitable_for: existing.suitable_for || [],
        destination_type: existing.destination_type || "",
        status: existing.status || "draft",
        flights_included: existing.flights_included || false,
        stay_included: existing.stay_included || false,
        transfers_included: existing.transfers_included || false,
        meals_included: existing.meals_included || false,
        breakfast_included: existing.breakfast_included || false,
        sightseeing_included: existing.sightseeing_included || false,
        support_247: existing.support_247 || false,
        hero_image: existing.hero_image || "",
        gallery: existing.gallery || [],
        highlights: existing.highlights || [],
        inclusions: existing.inclusions || "",
        exclusions: existing.exclusions || "",
        itinerary_days: (rawDays as DayPlan[]).map((d: any, i: number) => ({
          day: typeof d?.day === "number" ? d.day : i + 1,
          title: d?.title || "",
          description: d?.description || "",
          ...d,
          meals: d.meals || { breakfast: false, lunch: false, dinner: false },
          activities: d.activities || [],
          accommodation: d.accommodation || "",
        })),
        seo_title: existing.seo_title || "",
        seo_description: existing.seo_description || "",
        seo_keywords: existing.seo_keywords || "",
      });
    }
  }, [existing]);

  /* ── Auto-slug ── */
  useEffect(() => {
    if (isNew || !existing?.slug) {
      const slug = form.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      setForm(prev => ({ ...prev, slug }));
    }
  }, [form.headline]);

  /* ── Auto days = nights + 1 ── */
  useEffect(() => {
    if (form.nights !== null && form.nights !== undefined) {
      setForm(prev => ({ ...prev, days: (parseInt(prev.nights) || 0) + 1 }));
    }
  }, [form.nights]);

  /* ── Save mutation ── */
  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      const payload: any = {
        headline: form.headline,
        slug: form.slug,
        about: form.about || null,
        destination_id: form.destination_id || null,
        days: form.days || null,
        nights: form.nights || null,
        price_per_person: form.price_per_person || null,
        best_months: monthsToNums(form.best_months),
        themes: form.themes,
        suitable_for: form.suitable_for,
        destination_type: form.destination_type || null,
        status: publish ? "published" : form.status,
        flights_included: form.flights_included,
        stay_included: form.stay_included,
        transfers_included: form.transfers_included,
        meals_included: form.meals_included,
        breakfast_included: form.breakfast_included,
        sightseeing_included: form.sightseeing_included,
        support_247: form.support_247,
        hero_image: form.hero_image || null,
        gallery: form.gallery,
        highlights: form.highlights,
        inclusions: form.inclusions || null,
        exclusions: form.exclusions || null,
        itinerary_days: form.itinerary_days,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        seo_keywords: form.seo_keywords || null,
      };
      if (publish) payload.published_at = new Date().toISOString();

      if (isNew) {
        const { error } = await supabase.from("itineraries").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("itineraries").update(payload).eq("id", id!);
        if (error) throw error;
      }
    },
    onSuccess: (_, publish) => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      setLastSaved(new Date());
      if (publish) {
        toast.success("Itinerary published!");
        navigate("/admin/itineraries");
      } else {
        toast.success("Saved");
        if (isNew) navigate("/admin/itineraries");
      }
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  /* ── Auto-save every 30s ── */
  useEffect(() => {
    if (isNew) return;
    autoSaveTimer.current = setInterval(() => {
      if (form.headline) {
        setSaving(true);
        saveMutation.mutate(undefined);
        setTimeout(() => setSaving(false), 1500);
      }
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [form, isNew]);

  /* ── Helpers ── */
  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  // Auto-populate empty fields from destination on user selection.
  const onDestinationChange = (v: string) => {
    const dest: any = destinations.find((d: any) => d.id === v);
    setForm(prev => {
      const next: any = { ...prev, destination_id: v };
      if (!dest) return next;
      if ((!prev.best_months || prev.best_months.length === 0) && Array.isArray(dest.best_months)) {
        next.best_months = monthsToNames(dest.best_months);
      }
      if ((!prev.themes || prev.themes.length === 0) && Array.isArray(dest.themes)) {
        next.themes = dest.themes;
      }
      if ((!prev.suitable_for || prev.suitable_for.length === 0) && Array.isArray(dest.suitable_for)) {
        next.suitable_for = dest.suitable_for;
      }
      return next;
    });
  };
  const toggleArrayItem = (key: string, item: string) => {
    setForm(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(item) ? arr.filter((i: string) => i !== item) : [...arr, item] };
    });
  };

  const addDay = () => {
    const days = form.itinerary_days as DayPlan[];
    setField("itinerary_days", [...days, {
      day: days.length + 1, title: "", description: "", activities: [],
      meals: { breakfast: false, lunch: false, dinner: false }, accommodation: "",
    }]);
  };

  const updateDay = (idx: number, updates: Partial<DayPlan>) => {
    const days = [...(form.itinerary_days as DayPlan[])];
    days[idx] = { ...days[idx], ...updates };
    setField("itinerary_days", days);
  };

  const removeDay = (idx: number) => {
    const days = (form.itinerary_days as DayPlan[]).filter((_, i) => i !== idx).map((d, i) => ({ ...d, day: i + 1 }));
    setField("itinerary_days", days);
  };

  const selectedDest = destinations.find((d: any) => d.id === form.destination_id);

  return (
    <AppLayout title={isNew ? "New Itinerary" : "Edit Itinerary"}>
      {/* ── Sticky Top Bar ── */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/admin/itineraries")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Itineraries
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{form.headline || "New Itinerary"}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
          {lastSaved && !saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
          <Select value={form.status} onValueChange={v => setField("status", v)}>
            <SelectTrigger className="h-8 text-xs w-28 rounded-md"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(undefined)}
            disabled={saveMutation.isPending || !form.headline}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Draft
          </Button>
          <Button size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending || !form.headline}>
            <Globe className="h-3.5 w-3.5 mr-1" />Publish
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <StepProgress
        steps={STEPS}
        current={activeTab}
        completed={Array.from(completedSteps)}
        onJump={goTo}
        className="mb-5"
      />
      <Tabs value={activeTab} onValueChange={goTo}>
        <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none mb-5">
          {[
            { v: "summary", l: "Trip Summary" }, { v: "media", l: "Media" },
            { v: "details", l: "Itinerary Details" }, { v: "dayplan", l: "Day-by-Day Plan" },
            { v: "seo", l: "SEO Data" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ══ Tab 1: Trip Summary ══ */}
        <TabsContent value="summary" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Itinerary Headline <span className="text-destructive">*</span></Label>
                <Input value={form.headline} onChange={e => setField("headline", e.target.value)} className="mt-1 rounded-md text-base font-medium h-11" placeholder="e.g. Majestic Rajasthan — 7 Nights" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Slug</Label>
                <Input value={form.slug} onChange={e => setField("slug", e.target.value)} className="mt-1 rounded-md text-xs font-mono" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">About</Label>
                <Textarea value={form.about} onChange={e => setField("about", e.target.value)} rows={5} className="mt-1 rounded-md" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Destination</Label>
                  <Select value={form.destination_id} onValueChange={v => setField("destination_id", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select destination" /></SelectTrigger>
                    <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Pricing Per Person (₹)</Label>
                  <Input type="number" value={form.price_per_person || ""} onChange={e => setField("price_per_person", parseInt(e.target.value) || null)} className="mt-1 rounded-md" />
                </div>
              </div>

              {selectedDest?.about && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">About {selectedDest.name}</p>
                  <p className="text-xs text-blue-600">{(selectedDest as any).about}</p>
                </div>
              )}

              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nights</Label>
                  <Input type="number" value={form.nights ?? ""} onChange={e => setField("nights", parseInt(e.target.value) || null)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Days (auto)</Label>
                  <Input type="number" value={form.days ?? ""} readOnly className="mt-1 rounded-md bg-muted/30" />
                </div>
              </div>

              {/* Best months */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Best Time to Visit</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MONTHS.map(m => (
                    <button key={m} onClick={() => toggleArrayItem("best_months", m)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        (form.best_months as string[]).includes(m)
                          ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-border"
                      }`}>{m}</button>
                  ))}
                </div>
              </div>

              {/* Destination Theme */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Destination Theme</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mvByType("destination_type").map((v: any) => (
                    <button key={v.id} onClick={() => toggleArrayItem("themes", v.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        (form.themes as string[]).includes(v.value)
                          ? "bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-[hsl(var(--lagoon))]/30" : "border-border/50 hover:border-border"
                      }`}>{v.value}</button>
                  ))}
                </div>
              </div>

              {/* Suitable for */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Suitable For</Label>
                <div className="flex flex-wrap gap-1.5">
                  {mvByType("destination_suitable_type").map((v: any) => (
                    <button key={v.id} onClick={() => toggleArrayItem("suitable_for", v.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        (form.suitable_for as string[]).includes(v.value)
                          ? "bg-[hsl(var(--horizon))]/10 text-[hsl(var(--horizon))] border-[hsl(var(--horizon))]/30" : "border-border/50 hover:border-border"
                      }`}>{v.value}</button>
                  ))}
                </div>
              </div>

              {/* Inclusions checkboxes */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Inclusions</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INCLUSIONS.map(inc => (
                    <label key={inc.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form[inc.key]} onCheckedChange={v => setField(inc.key, v)} />
                      {inc.label}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <StepNav
            isFirst={stepIdx === 0}
            isLast={stepIdx === STEPS.length - 1}
            onBack={goBack}
            onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(undefined)}
            onSave={() => saveMutation.mutate(true)}
            saving={saveMutation.isPending}
            saveLabel="Save & Publish"
          />
        </TabsContent>

        {/* ══ Tab 2: Media ══ */}
        <TabsContent value="media" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Hero Image</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <ImageUploader
                folder={isNew ? "drafts" : (id as string)}
                filename="hero"
                value={form.hero_image}
                onChange={(url) => setField("hero_image", url)}
              />
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Gallery</CardTitle>
                <span className="text-xs text-muted-foreground">{(form.gallery as string[]).length}/10 images</span>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <MultiImageUploader
                folder={isNew ? "drafts" : (id as string)}
                prefix="gallery"
                values={form.gallery as string[]}
                onChange={(urls) => setField("gallery", urls)}
                max={10}
              />
            </CardContent>
          </Card>
          <StepNav
            isFirst={stepIdx === 0}
            isLast={stepIdx === STEPS.length - 1}
            onBack={goBack}
            onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(undefined)}
            onSave={() => saveMutation.mutate(true)}
            saving={saveMutation.isPending}
            saveLabel="Save & Publish"
          />
        </TabsContent>

        {/* ══ Tab 3: Details ══ */}
        <TabsContent value="details" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5 space-y-4">
              {/* Highlights */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Highlights</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(form.highlights as string[]).map((h, i) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1 rounded-md">
                      {h}
                      <button onClick={() => setField("highlights", (form.highlights as string[]).filter((_, idx) => idx !== i))}
                        className="ml-0.5 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Type and press Enter" value={highlightInput} onChange={e => setHighlightInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && highlightInput.trim()) {
                      e.preventDefault();
                      setField("highlights", [...(form.highlights as string[]), highlightInput.trim()]);
                      setHighlightInput("");
                    }
                  }} className="rounded-md" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Inclusions</Label>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.inclusions}
                    onChange={(v) => setField("inclusions", v)}
                    placeholder="What's included — flights, stays, meals, transfers…"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Exclusions</Label>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.exclusions}
                    onChange={(v) => setField("exclusions", v)}
                    placeholder="What's not included — visa fees, personal expenses…"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Important Notes</Label>
                <Textarea value={form.important_notes || ""} onChange={e => setField("important_notes", e.target.value)} rows={4} className="mt-1 rounded-md" placeholder="Visa requirements, health advisories, what to pack, local customs..." />
              </div>
            </CardContent>
          </Card>
          <StepNav
            isFirst={stepIdx === 0}
            isLast={stepIdx === STEPS.length - 1}
            onBack={goBack}
            onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(undefined)}
            onSave={() => saveMutation.mutate(true)}
            saving={saveMutation.isPending}
            saveLabel="Save & Publish"
          />
        </TabsContent>

        {/* ══ Tab 4: Day-by-Day ══ */}
        <TabsContent value="dayplan" className="space-y-4">
          <p className="text-sm text-muted-foreground">{(form.itinerary_days as DayPlan[]).length} day{(form.itinerary_days as DayPlan[]).length !== 1 ? "s" : ""} planned</p>
          {(form.itinerary_days as DayPlan[]).map((day, idx) => (
            <Card key={idx} className="border-border/50 shadow-none">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <Badge variant="outline" className="text-xs rounded-md">Day {day.day}</Badge>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeDay(idx)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Day Title</Label>
                    <Input value={day.title} onChange={e => updateDay(idx, { title: e.target.value })} className="mt-1 rounded-md" placeholder="e.g. Arrival in Jaipur" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea value={day.description} onChange={e => updateDay(idx, { description: e.target.value })} rows={3} className="mt-1 rounded-md" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Meals</Label>
                      <div className="flex gap-3 mt-1">
                        {(["breakfast", "lunch", "dinner"] as const).map(m => (
                          <label key={m} className="flex items-center gap-1.5 text-xs cursor-pointer capitalize">
                            <Checkbox checked={day.meals[m]} onCheckedChange={v => updateDay(idx, { meals: { ...day.meals, [m]: v } })} />
                            {m}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Accommodation</Label>
                      <Input value={day.accommodation} onChange={e => updateDay(idx, { accommodation: e.target.value })} className="mt-1 rounded-md text-xs" placeholder="Hotel name" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(form.itinerary_days as DayPlan[]).length === 0 && (
            <Card className="border-border/50 shadow-none">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground mb-3">No days planned yet</p>
                <Button variant="outline" size="sm" onClick={addDay} className="rounded-md"><Plus className="h-3.5 w-3.5 mr-1" />Add First Day</Button>
              </CardContent>
            </Card>
          )}
          {(form.itinerary_days as DayPlan[]).length > 0 && (
            <div className="flex justify-center pt-2">
              <Button size="sm" variant="outline" onClick={addDay} className="rounded-md text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" />Add Day
              </Button>
            </div>
          )}
          <StepNav
            isFirst={stepIdx === 0}
            isLast={stepIdx === STEPS.length - 1}
            onBack={goBack}
            onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(undefined)}
            onSave={() => saveMutation.mutate(true)}
            saving={saveMutation.isPending}
            saveLabel="Save & Publish"
          />
        </TabsContent>

        {/* ══ Tab 5: SEO ══ */}
        <TabsContent value="seo" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">SEO Title</Label>
                  <span className={`text-[10px] ${(form.seo_title?.length || 0) > 60 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.seo_title?.length || 0}/60
                  </span>
                </div>
                <Input value={form.seo_title} onChange={e => setField("seo_title", e.target.value)} className="mt-1 rounded-md" maxLength={60} />
              </div>
              <div>
                <div className="flex justify-between">
                  <Label className="text-xs text-muted-foreground">Meta Description</Label>
                  <span className={`text-[10px] ${(form.seo_description?.length || 0) > 160 ? "text-destructive" : "text-muted-foreground"}`}>
                    {form.seo_description?.length || 0}/160
                  </span>
                </div>
                <Textarea value={form.seo_description} onChange={e => setField("seo_description", e.target.value)} rows={3} className="mt-1 rounded-md" maxLength={160} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">SEO Keywords</Label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.seo_keywords?.split(",").filter(Boolean).map((k: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs gap-1 rounded-md">
                      {k.trim()}
                      <button onClick={() => {
                        const kws = form.seo_keywords.split(",").filter(Boolean);
                        kws.splice(i, 1);
                        setField("seo_keywords", kws.join(","));
                      }} className="ml-0.5 hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Type and press Enter" value={seoKeywordInput} onChange={e => setSeoKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && seoKeywordInput.trim()) {
                      e.preventDefault();
                      const current = form.seo_keywords ? form.seo_keywords + "," : "";
                      setField("seo_keywords", current + seoKeywordInput.trim());
                      setSeoKeywordInput("");
                    }
                  }} className="rounded-md" />
              </div>

              <Separator />

              {/* OG Preview */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Open Graph Preview</Label>
                <div className="border border-border/50 rounded-lg overflow-hidden max-w-sm">
                  {form.hero_image && <img src={form.hero_image} alt="" className="w-full h-32 object-cover" />}
                  <div className="p-3 bg-muted/20">
                    <p className="text-xs text-muted-foreground">adventourist.com</p>
                    <p className="text-sm font-medium mt-0.5">{form.seo_title || form.headline || "Itinerary Title"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{form.seo_description || form.about || "Description"}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Canonical URL</Label>
                <div className="mt-1 px-3 py-2 bg-muted/30 rounded-md text-xs font-mono text-muted-foreground">
                  /trips/{form.slug || "..."}
                </div>
              </div>
            </CardContent>
          </Card>
          <StepNav
            isFirst={stepIdx === 0}
            isLast={stepIdx === STEPS.length - 1}
            onBack={goBack}
            onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(undefined)}
            onSave={() => saveMutation.mutate(true)}
            saving={saveMutation.isPending}
            saveLabel="Save & Publish"
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default ItineraryEdit;
