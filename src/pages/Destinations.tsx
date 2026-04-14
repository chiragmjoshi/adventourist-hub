import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const Destinations = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", slug: "", about: "", best_months: "", themes: "", suitable_for: "" });

  const { data: destinations = [], isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createDestination = useMutation({
    mutationFn: async (f: typeof form) => {
      const slug = f.slug || f.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("destinations").insert({
        name: f.name,
        slug,
        about: f.about || null,
        best_months: f.best_months ? f.best_months.split(",").map((s) => s.trim()) : [],
        themes: f.themes ? f.themes.split(",").map((s) => s.trim()) : [],
        suitable_for: f.suitable_for ? f.suitable_for.split(",").map((s) => s.trim()) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["destinations"] });
      setDialogOpen(false);
      setForm({ name: "", slug: "", about: "", best_months: "", themes: "", suitable_for: "" });
      toast.success("Destination created");
    },
    onError: () => toast.error("Failed to create destination"),
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
            <Button><Plus className="h-4 w-4 mr-1" /> Add Destination</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Destination</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createDestination.mutate(form); }} className="space-y-4">
              <div className="space-y-1"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
              <div className="space-y-1"><Label>About</Label><Textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} rows={3} /></div>
              <div className="space-y-1"><Label>Best Months (comma-separated)</Label><Input value={form.best_months} onChange={(e) => setForm({ ...form, best_months: e.target.value })} placeholder="Oct, Nov, Dec" /></div>
              <div className="space-y-1"><Label>Themes (comma-separated)</Label><Input value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} placeholder="Adventure, Culture" /></div>
              <div className="space-y-1"><Label>Suitable For (comma-separated)</Label><Input value={form.suitable_for} onChange={(e) => setForm({ ...form, suitable_for: e.target.value })} placeholder="Couples, Family" /></div>
              <Button type="submit" className="w-full" disabled={createDestination.isPending}>
                {createDestination.isPending ? "Creating..." : "Create Destination"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead className="text-table">Name</TableHead><TableHead className="text-table">Themes</TableHead><TableHead className="text-table">Best Months</TableHead><TableHead className="text-table">Active</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : destinations.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No destinations yet</TableCell></TableRow>
              ) : (
                destinations.map((d: any) => (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="text-table font-medium">{d.name}</TableCell>
                    <TableCell className="text-table">
                      <div className="flex gap-1 flex-wrap">
                        {d.themes?.map((t: string) => <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell className="text-table text-muted-foreground">{d.best_months?.join(", ") ?? "—"}</TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: d.id, is_active: v })} />
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
