import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ChevronRight, Save, Eye, Check, Plus, X, Image as ImageIcon, Info } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/formatINR";
import StepProgress from "@/components/forms/StepProgress";
import StepNav from "@/components/forms/StepNav";
import ImageUploader from "@/components/forms/ImageUploader";
import MultiImageUploader from "@/components/forms/MultiImageUploader";
import RichTextEditor from "@/components/forms/RichTextEditor";
import TestimonialPicker from "@/components/forms/TestimonialPicker";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

import AttributionFields from "@/components/AttributionFields";

const LandingPageEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "new";
  const [activeTab, setActiveTab] = useState("content");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [useItineraryInclusions, setUseItineraryInclusions] = useState(true);

  const [form, setForm] = useState({
    name: "", slug: "", destination_id: "", itinerary_id: "",
    template_id: "bold",
    hero_headline: "", hero_subtext: "", hero_image: "",
    budget: 0, stay_days: "", best_time_to_visit: [] as string[],
    suitable_for: [] as string[], destination_type: [] as string[],
    channel: "", platform: "", campaign_type: "", ad_group: "",
    gallery: [] as string[], why_adventourist: "",
    custom_inclusions: "", custom_exclusions: "",
    testimonial_ids: [] as string[],
    seo_title: "", seo_description: "", is_active: false,
    form_title: "Enquire for Free",
    form_subtitle: "Our travel experts will call you, ask your queries without hesitation.",
    form_terms_label: "", form_submit_text: "Submit",
    form_after_submit_message: "Thank you! We'll call you within 24 hours.",
  });

  const STEPS = [
    { key: "content", label: "Page Content" },
    { key: "trip", label: "Trip Details" },
    { key: "attribution", label: "Attribution" },
    { key: "gallery", label: "Gallery & Media" },
    { key: "seo", label: "SEO" },
  ];
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const stepIdx = STEPS.findIndex((s) => s.key === activeTab);
  const goTo = (k: string) => { setActiveTab(k); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const goNext = () => { setCompletedSteps((p) => new Set(p).add(activeTab)); if (stepIdx < STEPS.length - 1) goTo(STEPS[stepIdx + 1].key); };
  const goBack = () => { if (stepIdx > 0) goTo(STEPS[stepIdx - 1].key); };

  const { data: existing } = useQuery({
    queryKey: ["landing_page", id], enabled: !isNew,
    queryFn: async () => { const { data, error } = await supabase.from("landing_pages").select("*").eq("id", id!).single(); if (error) throw error; return data; },
  });

  const { data: destinations = [] } = useQuery({
    queryKey: ["destinations_active"],
    queryFn: async () => { const { data } = await supabase.from("destinations").select("id, name").eq("is_active", true).order("name"); return data || []; },
  });

  const { data: itineraries = [] } = useQuery({
    queryKey: ["itineraries_all"],
    queryFn: async () => { const { data } = await supabase.from("itineraries").select("id, headline, destination_id, itinerary_days, inclusions, exclusions").order("headline"); return data || []; },
  });

  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values_all"],
    queryFn: async () => { const { data } = await supabase.from("master_values").select("type, value").eq("is_active", true).order("sort_order"); return data || []; },
  });

  const getMV = (type: string) => masterValues.filter((m: any) => m.type === type).map((m: any) => m.value);
  const linkedItinerary = itineraries.find((i: any) => i.id === form.itinerary_id);
  const filteredItineraries = form.destination_id ? itineraries.filter((i: any) => i.destination_id === form.destination_id) : itineraries;

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name || "", slug: existing.slug || "",
        destination_id: existing.destination_id || "", itinerary_id: (existing as any).itinerary_id || "",
        template_id: (existing as any).template_id || "bold",
        hero_headline: existing.hero_headline || "", hero_subtext: existing.hero_subtext || "",
        hero_image: (existing as any).hero_image || "",
        budget: existing.budget || 0, stay_days: (existing as any).stay_days || "",
        best_time_to_visit: (existing as any).best_time_to_visit || existing.time_to_visit || [],
        suitable_for: existing.suitable_for || [], destination_type: (existing as any).destination_type || [],
        channel: existing.channel || "", platform: existing.platform || "",
        campaign_type: existing.campaign_type || "", ad_group: existing.ad_group || "",
        gallery: (existing as any).gallery || [], why_adventourist: (existing as any).why_adventourist || "",
        custom_inclusions: (existing as any).custom_inclusions || "",
        custom_exclusions: (existing as any).custom_exclusions || "",
        seo_title: (existing as any).seo_title || "", seo_description: (existing as any).seo_description || "",
        is_active: existing.is_active ?? false,
        form_title: (existing as any).form_title || "Enquire for Free",
        form_subtitle: (existing as any).form_subtitle || "Our travel experts will call you, ask your queries without hesitation.",
        form_terms_label: (existing as any).form_terms_label || "",
        form_submit_text: (existing as any).form_submit_text || "Submit",
        form_after_submit_message: (existing as any).form_after_submit_message || "Thank you! We'll call you within 24 hours.",
        testimonial_ids: (existing as any).testimonial_ids || [],
      });
      if ((existing as any).custom_inclusions || (existing as any).custom_exclusions) setUseItineraryInclusions(false);
    }
  }, [existing]);

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  // Auto-slug from headline
  useEffect(() => {
    if (isNew && form.hero_headline && !existing) {
      setField("slug", slugify(form.hero_headline));
    }
  }, [form.hero_headline, isNew]);

  const toggleMonth = (m: string) => {
    setField("best_time_to_visit", form.best_time_to_visit.includes(m) ? form.best_time_to_visit.filter(x => x !== m) : [...form.best_time_to_visit, m]);
  };

  const toggleChip = (field: string, val: string) => {
    const arr = (form as any)[field] as string[];
    setField(field, arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val]);
  };

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      const payload: any = {
        name: form.name || form.hero_headline, slug: form.slug,
        destination_id: form.destination_id || null, itinerary_id: form.itinerary_id || null,
        template_id: form.template_id || "bold",
        hero_headline: form.hero_headline, hero_subtext: form.hero_subtext,
        hero_image: form.hero_image || null,
        budget: form.budget || null, stay_days: form.stay_days || null,
        time_to_visit: form.best_time_to_visit, suitable_for: form.suitable_for,
        destination_type: form.destination_type,
        channel: form.channel || null, platform: form.platform || null,
        campaign_type: form.campaign_type || null, ad_group: form.ad_group || null,
        gallery: form.gallery, why_adventourist: form.why_adventourist || null,
        custom_inclusions: useItineraryInclusions ? null : form.custom_inclusions || null,
        custom_exclusions: useItineraryInclusions ? null : form.custom_exclusions || null,
        seo_title: form.seo_title || null, seo_description: form.seo_description || null,
        is_active: publish ? true : form.is_active,
        form_title: form.form_title, form_subtitle: form.form_subtitle,
        form_terms_label: form.form_terms_label || null, form_submit_text: form.form_submit_text,
        form_after_submit_message: form.form_after_submit_message,
        testimonial_ids: form.testimonial_ids,
      };
      if (publish) payload.published_at = new Date().toISOString();

      if (isNew) {
        const { data, error } = await supabase.from("landing_pages").insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      } else {
        const { error } = await supabase.from("landing_pages").update(payload).eq("id", id!);
        if (error) throw error;
        return id;
      }
    },
    onSuccess: (newId) => {
      queryClient.invalidateQueries({ queryKey: ["landing_pages"] });
      setLastSaved(new Date());
      toast.success("Page saved");
      if (isNew && newId) navigate(`/admin/landing-pages/edit/${newId}`, { replace: true });
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  return (
    <AppLayout title={isNew ? "New Landing Page" : "Edit Landing Page"}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => navigate("/admin/landing-pages")} className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />Landing Pages
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{form.name || form.hero_headline || "New Page"}</span>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="h-3 w-3" />Saved</span>}
          <div className="flex items-center gap-2 border border-border/50 rounded-md px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Active</span>
            <Switch checked={form.is_active} onCheckedChange={v => setField("is_active", v)} />
          </div>
          {form.slug && (
            <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => window.open(`https://www.adventourist.in/l/${form.slug}?preview=true`, "_blank")}>
              <Eye className="h-3.5 w-3.5 mr-1" />Preview
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />Save Draft
          </Button>
          <Button size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />Publish
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <StepProgress steps={STEPS} current={activeTab} completed={Array.from(completedSteps)} onJump={goTo} className="mb-5" />
        <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none mb-5">
          {[
            { v: "content", l: "Page Content" }, { v: "trip", l: "Trip Details" },
            { v: "attribution", l: "Attribution" }, { v: "gallery", l: "Gallery & Media" },
            { v: "seo", l: "SEO" },
          ].map(t => (
            <TabsTrigger key={t.v} value={t.v}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm">
              {t.l}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB 1 — Page Content */}
        <TabsContent value="content" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Template</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-[10px] text-muted-foreground mb-3">Choose how this landing page is rendered. You can switch anytime.</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "bold", name: "Bold", desc: "Conversion-focused with prominent CTA and form" },
                  { id: "minimal", name: "Minimal", desc: "Editorial, typography-driven, lots of whitespace" },
                  { id: "story", name: "Story", desc: "Narrative scroll with rich imagery" },
                ].map(t => {
                  const active = form.template_id === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setField("template_id", t.id)}
                      className={`text-left rounded-lg border p-3 transition-colors ${active ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        {active && <Check className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-snug">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Hero</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Page Name (internal)</Label>
                <Input value={form.name} onChange={e => setField("name", e.target.value)} className="mt-1 rounded-md" placeholder="Internal page name" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Page Headline *</Label>
                <Input value={form.hero_headline} onChange={e => setField("hero_headline", e.target.value)} className="mt-1 rounded-md" placeholder="City of the Future: A Singapore Story" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hero Subtext</Label>
                <Textarea value={form.hero_subtext} onChange={e => setField("hero_subtext", e.target.value)} rows={2}
                  className="mt-1 rounded-md" placeholder="Discover Singapore's iconic skyline, world-class attractions and vibrant culture" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hero Image</Label>
                <div className="mt-1">
                  <ImageUploader
                    folder={isNew ? "landing-drafts" : `landing-${id}`}
                    filename="hero"
                    value={form.hero_image}
                    onChange={(url) => setField("hero_image", url)}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">URL Slug</Label>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-muted-foreground">/l/</span>
                  <Input value={form.slug} onChange={e => setField("slug", e.target.value)} className="rounded-md font-mono text-xs" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Trip Summary Strip</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Destination *</Label>
                  <Select value={form.destination_id} onValueChange={v => setField("destination_id", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Featured Itinerary</Label>
                  <Select value={form.itinerary_id} onValueChange={v => setField("itinerary_id", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{filteredItineraries.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.headline}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Budget (₹ per person)</Label>
                  <Input type="number" value={form.budget || ""} onChange={e => setField("budget", parseInt(e.target.value) || 0)} className="mt-1 rounded-md" />
                  {form.budget > 0 && <p className="text-[10px] text-muted-foreground mt-1">{formatINR(form.budget)} Per Person onwards</p>}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Stay Days</Label>
                  <Input value={form.stay_days} onChange={e => setField("stay_days", e.target.value)} className="mt-1 rounded-md" placeholder="5 Days & 4 Nights" />
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Best Time to Visit</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MONTHS.map(m => (
                    <button key={m} onClick={() => toggleMonth(m)} type="button"
                      className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${form.best_time_to_visit.includes(m) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/30"}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Suitable For</Label>
                <div className="flex flex-wrap gap-1.5">
                  {getMV("destination_suitable_type").map(v => (
                    <button key={v} onClick={() => toggleChip("suitable_for", v)} type="button"
                      className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${form.suitable_for.includes(v) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/30"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Destination Type / Trip Category</Label>
                <div className="flex flex-wrap gap-1.5">
                  {getMV("destination_type").map(v => (
                    <button key={v} onClick={() => toggleChip("destination_type", v)} type="button"
                      className={`px-2.5 py-1 rounded-full text-[10px] border transition-colors ${form.destination_type.includes(v) ? "bg-primary text-primary-foreground border-primary" : "border-border/50 hover:border-primary/30"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Enquiry Form Settings</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Form Title</Label>
                  <Input value={form.form_title} onChange={e => setField("form_title", e.target.value)} className="mt-1 rounded-md" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Submit Button Text</Label>
                  <Input value={form.form_submit_text} onChange={e => setField("form_submit_text", e.target.value)} className="mt-1 rounded-md" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Form Subtitle</Label>
                <Input value={form.form_subtitle} onChange={e => setField("form_subtitle", e.target.value)} className="mt-1 rounded-md" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Terms & Conditions Label</Label>
                <Input value={form.form_terms_label} onChange={e => setField("form_terms_label", e.target.value)} className="mt-1 rounded-md" placeholder="I agree to the terms and conditions" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">After Submit Message</Label>
                <Input value={form.form_after_submit_message} onChange={e => setField("form_after_submit_message", e.target.value)} className="mt-1 rounded-md" />
              </div>
            </CardContent>
          </Card>
          <StepNav isFirst={stepIdx === 0} isLast={stepIdx === STEPS.length - 1} onBack={goBack} onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(false)} onSave={() => saveMutation.mutate(true)} saving={saveMutation.isPending} saveLabel="Publish" />
        </TabsContent>

        {/* TAB 2 — Trip Details */}
        <TabsContent value="trip" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Itinerary</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              {linkedItinerary ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-700 flex items-center gap-1.5"><Info className="h-3.5 w-3.5" />Day-by-day plan is pulled from the linked itinerary. Edit the itinerary to change this.</p>
                  </div>
                  {Array.isArray(linkedItinerary.itinerary_days) && (linkedItinerary.itinerary_days as any[]).length > 0 ? (
                    <div className="space-y-3">
                      {(linkedItinerary.itinerary_days as any[]).map((day: any, idx: number) => (
                        <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border/30">
                          <p className="text-xs font-medium">Day {idx + 1}{day.title ? ` — ${day.title}` : ""}</p>
                          {day.description && <p className="text-[10px] text-muted-foreground mt-1">{day.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-muted-foreground">No day-by-day plan defined in this itinerary.</p>}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Select a Featured Itinerary in the Page Content tab to preview the day-by-day plan here.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Inclusions & Exclusions</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Use itinerary data</span>
                  <Switch checked={useItineraryInclusions} onCheckedChange={setUseItineraryInclusions} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-4">
              {useItineraryInclusions ? (
                linkedItinerary ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Inclusions</Label>
                      <div className="mt-1 p-3 bg-muted/20 rounded-md text-xs whitespace-pre-wrap border border-border/30">{linkedItinerary.inclusions || "Not defined"}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Exclusions</Label>
                      <div className="mt-1 p-3 bg-muted/20 rounded-md text-xs whitespace-pre-wrap border border-border/30">{linkedItinerary.exclusions || "Not defined"}</div>
                    </div>
                  </div>
                ) : <p className="text-xs text-muted-foreground">Select a Featured Itinerary to use its inclusions/exclusions.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Custom Inclusions</Label>
                    <div className="mt-1">
                      <RichTextEditor value={form.custom_inclusions} onChange={(v) => setField("custom_inclusions", v)} placeholder="Override the itinerary's inclusions for this campaign..." />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Custom Exclusions</Label>
                    <div className="mt-1">
                      <RichTextEditor value={form.custom_exclusions} onChange={(v) => setField("custom_exclusions", v)} placeholder="Override the itinerary's exclusions for this campaign..." />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Why Adventourist</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <Textarea value={form.why_adventourist} onChange={e => setField("why_adventourist", e.target.value)} rows={4} className="rounded-md"
                placeholder="Leave blank to use default Adventourist trust content" />
              <p className="text-[10px] text-muted-foreground mt-1">Default: "At Adventourist, we create personal, life-enriching journeys..."</p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Testimonials</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-[10px] text-muted-foreground mb-3">Pick testimonials to show on this landing page. Manage testimonials on each Destination.</p>
              <TestimonialPicker
                selectedIds={form.testimonial_ids}
                onChange={(ids) => setField("testimonial_ids", ids)}
                destinationId={form.destination_id || undefined}
              />
            </CardContent>
          </Card>
          <StepNav isFirst={stepIdx === 0} isLast={stepIdx === STEPS.length - 1} onBack={goBack} onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(false)} onSave={() => saveMutation.mutate(true)} saving={saveMutation.isPending} saveLabel="Publish" />
        </TabsContent>

        {/* TAB 3 — Attribution */}
        <TabsContent value="attribution" className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
            <p className="text-xs text-amber-800 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />Every lead from this landing page will automatically be tagged with these values. This powers your revenue attribution reports.
            </p>
          </div>

          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Platform *</Label>
                  <Select value={form.platform} onValueChange={v => { setField("platform", v); setField("channel", ""); }}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{getMV("platform").map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Channel *</Label>
                  <Select value={form.channel} onValueChange={v => setField("channel", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{filterChannelsByPlatform(getMV("channel"), form.platform).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Campaign Type</Label>
                  <Select value={form.campaign_type} onValueChange={v => setField("campaign_type", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{getMV("campaign_type").map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Ad Group</Label>
                  <Select value={form.ad_group} onValueChange={v => setField("ad_group", v)}>
                    <SelectTrigger className="mt-1 rounded-md"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{getMV("ad_group").map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          {(form.platform || form.channel) && (
            <Card className="border-border/50 shadow-none bg-muted/20">
              <CardContent className="p-5">
                <p className="text-xs font-medium mb-3">Lead Attribution Preview</p>
                <p className="text-[10px] text-muted-foreground mb-3">When someone submits the form on this page, their lead will be tagged as:</p>
                <div className="space-y-1.5 mb-3">
                  {[["Platform", form.platform], ["Channel", form.channel], ["Campaign", form.campaign_type], ["Ad Group", form.ad_group]].map(([label, val]) => (
                    <div key={label} className="flex text-xs">
                      <span className="w-24 text-muted-foreground">{label}:</span>
                      <span className="font-medium">{val || "—"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">These values cannot be changed by the sales team.</p>
              </CardContent>
            </Card>
          )}
          <StepNav isFirst={stepIdx === 0} isLast={stepIdx === STEPS.length - 1} onBack={goBack} onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(false)} onSave={() => saveMutation.mutate(true)} saving={saveMutation.isPending} saveLabel="Publish" />
        </TabsContent>

        {/* TAB 4 — Gallery & Media */}
        <TabsContent value="gallery" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Gallery Images</CardTitle></CardHeader>
            <CardContent className="px-5 pb-5">
              <p className="text-[10px] text-muted-foreground mb-3">Images appear in the gallery section of the landing page. Max 10 images.</p>
              <MultiImageUploader
                folder={isNew ? "landing-drafts" : `landing-${id}`}
                prefix="gallery"
                values={form.gallery}
                onChange={(urls) => setField("gallery", urls)}
                max={10}
              />
            </CardContent>
          </Card>
          <StepNav isFirst={stepIdx === 0} isLast={stepIdx === STEPS.length - 1} onBack={goBack} onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(false)} onSave={() => saveMutation.mutate(true)} saving={saveMutation.isPending} saveLabel="Publish" />
        </TabsContent>

        {/* TAB 5 — SEO */}
        <TabsContent value="seo" className="space-y-5">
          <Card className="border-border/50 shadow-none">
            <CardContent className="p-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">SEO Title</Label>
                <Input value={form.seo_title || form.hero_headline} onChange={e => setField("seo_title", e.target.value)} className="mt-1 rounded-md" maxLength={60} />
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{(form.seo_title || form.hero_headline || "").length}/60</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Meta Description</Label>
                <Textarea value={form.seo_description || form.hero_subtext} onChange={e => setField("seo_description", e.target.value)} rows={3} className="mt-1 rounded-md" maxLength={160} />
                <p className="text-[10px] text-muted-foreground text-right mt-0.5">{(form.seo_description || form.hero_subtext || "").length}/160</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Canonical URL</Label>
                <div className="mt-1 p-2.5 bg-muted/20 rounded-md text-xs font-mono border border-border/30">
                  https://www.adventourist.in/l/{form.slug || "..."}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Canonical points to main domain for SEO consistency</p>
              </div>

              {/* OG Preview */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Open Graph Preview</Label>
                <div className="border border-border/50 rounded-lg overflow-hidden max-w-md">
                  {form.hero_image && <img src={form.hero_image} alt="OG" className="w-full h-32 object-cover" />}
                  <div className="p-3 bg-muted/10">
                    <p className="text-[10px] text-muted-foreground">adventourist.in</p>
                    <p className="text-xs font-medium mt-0.5">{form.seo_title || form.hero_headline || "Page Title"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{form.seo_description || form.hero_subtext || "Page description"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <StepNav isFirst={stepIdx === 0} isLast={stepIdx === STEPS.length - 1} onBack={goBack} onNext={goNext}
            onSaveDraft={() => saveMutation.mutate(false)} onSave={() => saveMutation.mutate(true)} saving={saveMutation.isPending} saveLabel="Publish" />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default LandingPageEdit;
