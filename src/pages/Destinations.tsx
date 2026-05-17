import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/forms/ImageUploader";
import MultiImageUploader from "@/components/forms/MultiImageUploader";
import ChipMultiSelect from "@/components/forms/ChipMultiSelect";
import TestimonialEditor, { TestimonialItem } from "@/components/forms/TestimonialEditor";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthsToNames = (nums: any): string[] =>
  Array.isArray(nums) ? nums.map((n: any) => MONTHS[Number(n) - 1]).filter(Boolean) : [];
const monthsToNums = (names: string[]): number[] =>
  names.map((m) => MONTHS.indexOf(m) + 1).filter((n) => n >= 1);

interface DestForm {
  id?: string;
  name: string;
  slug: string;
  about: string;
  best_months: string[];
  themes: string[];
  suitable_for: string[];
  hero_image: string;
  gallery: string[];
  testimonials: TestimonialItem[];
  is_active: boolean;
}

const empty: DestForm = {
  name: "", slug: "", about: "", best_months: [], themes: [], suitable_for: [],
  hero_image: "", gallery: [], testimonials: [], is_active: true,
};

const Destinations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<DestForm>(empty);
  const [tab, setTab] = useState("basics");
  const queryClient = useQueryClient();

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: masterValues = [] } = useQuery({
    queryKey: ["master_values_active"],
    queryFn: async () => {
      const { data } = await supabase.from("master_values").select("type, value").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });
  const mv = (type: string) => masterValues.filter((m: any) => m.type === type).map((m: any) => m.value);

  // auto-slug
  useEffect(() => {
    if (!form.id && form.name) {
      const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      setForm((f) => ({ ...f, slug }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.name]);

  const open = (d?: any) => {
    if (d) {
      setForm({
        id: d.id, name: d.name || "", slug: d.slug || "", about: d.about || "",
        best_months: monthsToNames(d.best_months), themes: d.themes || [], suitable_for: d.suitable_for || [],
        hero_image: d.hero_image || "", gallery: d.gallery || [],
        testimonials: Array.isArray(d.testimonials) ? d.testimonials : [],
        is_active: d.is_active ?? true,
      });
    } else {
      setForm(empty);
    }
    setTab("basics");
    setDialogOpen(true);
  };

  const save = useMutation({
    mutationFn: async (f: DestForm) => {
      const payload: any = {
        name: f.name,
        slug: f.slug || f.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
        about: f.about || null,
        best_months: monthsToNums(f.best_months),
        themes: f.themes,
        suitable_for: f.suitable_for,
        hero_image: f.hero_image || null,
        gallery: f.gallery,
        testimonials: f.testimonials as any,
        is_active: f.is_active,
      };
      if (f.id) {
        const { error } = await supabase.from("destinations").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("destinations").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      setDialogOpen(false);
      toast.success(form.id ? "Destination updated" : "Destination created");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save destination"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("destinations").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["destinations"] }),
  });

  return (
    <AppLayout title="Destinations">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{destinations.length} destinations</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => open()}><Plus className="h-4 w-4 mr-1" /> Add Destination</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Destination" : "Add Destination"}</DialogTitle>
            </DialogHeader>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="border-b border-border/50 bg-transparent p-0 h-auto gap-0 rounded-none mb-5">
                {[
                  { v: "basics", l: "Basics" },
                  { v: "media", l: "Media" },
                  { v: "categorization", l: "Categorization" },
                  { v: "testimonials", l: "Testimonials" },
                ].map((t) => (
                  <TabsTrigger key={t.v} value={t.v}
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 pb-2.5 pt-1 text-sm">
                    {t.l}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="basics" className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-md" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Slug</Label>
                    <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-md font-mono text-xs" placeholder="auto-generated" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">About</Label>
                  <Textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={6} className="rounded-md" />
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">Inactive destinations are hidden from public site and selectors.</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-5">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Hero Image</Label>
                  <ImageUploader
                    folder={`destinations/${form.id || "drafts"}`}
                    filename="hero"
                    value={form.hero_image}
                    onChange={(url) => setForm({ ...form, hero_image: url })}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label className="text-xs text-muted-foreground">Gallery</Label>
                    <span className="text-xs text-muted-foreground">{form.gallery.length}/12 images</span>
                  </div>
                  <MultiImageUploader
                    folder={`destinations/${form.id || "drafts"}`}
                    prefix="gallery"
                    values={form.gallery}
                    onChange={(urls) => setForm({ ...form, gallery: urls })}
                    max={12}
                  />
                </div>
              </TabsContent>

              <TabsContent value="categorization" className="space-y-5">
                <ChipMultiSelect
                  label="Best Time to Visit"
                  options={MONTHS}
                  values={form.best_months}
                  onChange={(v) => setForm({ ...form, best_months: v })}
                />
                <ChipMultiSelect
                  label="Destination Theme"
                  options={mv("destination_type")}
                  values={form.themes}
                  onChange={(v) => setForm({ ...form, themes: v })}
                  variant="lagoon"
                />
                <ChipMultiSelect
                  label="Suitable For"
                  options={mv("destination_suitable_type")}
                  values={form.suitable_for}
                  onChange={(v) => setForm({ ...form, suitable_for: v })}
                  variant="horizon"
                />
              </TabsContent>

              <TabsContent value="testimonials" className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Add traveller testimonials. These can be selected on landing pages for this destination.
                </p>
                <TestimonialEditor
                  values={form.testimonials}
                  onChange={(v) => setForm({ ...form, testimonials: v })}
                  folder={`destinations/${form.id || "drafts"}/testimonials`}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.name}>
                {save.isPending ? "Saving..." : form.id ? "Save Changes" : "Create Destination"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-table">Name</TableHead>
                <TableHead className="text-table">Themes</TableHead>
                <TableHead className="text-table">Best Months</TableHead>
                <TableHead className="text-table">Active</TableHead>
                <TableHead className="text-table w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : destinations.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No destinations yet</TableCell></TableRow>
              ) : (
                destinations.map((d: any) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="text-table font-medium">
                      <div className="flex items-center gap-2">
                        {d.hero_image && <img src={d.hero_image} alt="" className="h-8 w-8 rounded-md object-cover border border-border/30" />}
                        {d.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-table">
                      <div className="flex gap-1 flex-wrap">
                        {d.themes?.map((t: string) => <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-table text-muted-foreground">{monthsToNames(d.best_months).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: d.id, is_active: v })} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => open(d)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Destinations;