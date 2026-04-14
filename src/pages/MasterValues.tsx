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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  "platform", "channel", "campaign_type", "ad_group", "sales_status",
  "disposition", "destination_type", "destination_suitable_type", "service_type", "city",
] as const;

const MasterValues = () => {
  const [activeTab, setActiveTab] = useState<string>("platform");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ type: "platform", value: "", sort_order: 0 });
  const queryClient = useQueryClient();

  const { data: values = [], isLoading } = useQuery({
    queryKey: ["master_values"],
    queryFn: async () => {
      const { data, error } = await supabase.from("master_values").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const createValue = useMutation({
    mutationFn: async (f: typeof form) => {
      const { error } = await supabase.from("master_values").insert({
        type: f.type,
        value: f.value,
        sort_order: f.sort_order,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_values"] });
      setDialogOpen(false);
      setForm({ type: activeTab, value: "", sort_order: 0 });
      toast.success("Value added");
    },
    onError: () => toast.error("Failed to add value"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("master_values").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master_values"] }),
  });

  const filtered = values.filter((v: any) => v.type === activeTab);

  return (
    <AppLayout title="Master Values">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Configure dropdown options across the CMS</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ ...form, type: activeTab })}><Plus className="h-4 w-4 mr-1" /> Add Value</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Master Value</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createValue.mutate(form); }} className="space-y-4">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Value *</Label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} required /></div>
              <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
              <Button type="submit" className="w-full" disabled={createValue.isPending}>{createValue.isPending ? "Adding..." : "Add Value"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          {TYPES.map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">{t.replace(/_/g, " ")}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={activeTab}>
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="text-table">Value</TableHead><TableHead className="text-table">Sort Order</TableHead><TableHead className="text-table">Active</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No values for this type</TableCell></TableRow>
                  ) : (
                    filtered.map((v: any) => (
                      <TableRow key={v.id} className="hover:bg-muted/30">
                        <TableCell className="text-table font-medium">{v.value}</TableCell>
                        <TableCell className="text-table text-muted-foreground">{v.sort_order}</TableCell>
                        <TableCell><Switch checked={v.is_active} onCheckedChange={(val) => toggleActive.mutate({ id: v.id, is_active: val })} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default MasterValues;
