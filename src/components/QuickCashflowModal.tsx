import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface QuickCashflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any;
}

const addDays = (iso: string, days: number) => {
  if (!iso) return "";
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function QuickCashflowModal({ open, onOpenChange, lead }: QuickCashflowModalProps) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  /* Reuse the same cached lookups the lead-detail page already prefetches. */
  const { data: lookups } = useQuery({
    queryKey: ["lead_detail_lookups"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [destRes, itinRes] = await Promise.all([
        supabase.from("destinations").select("id, name").eq("is_active", true),
        supabase.from("itineraries").select("id, headline, destination_id, nights"),
      ]);
      return {
        destinations: destRes.data || [],
        itineraries: itinRes.data || [],
      };
    },
  });
  const destinations = lookups?.destinations || [];
  const allItineraries = lookups?.itineraries || [];

  const [form, setForm] = useState({
    destination_id: "",
    itinerary_id: "",
    travel_start_date: "",
    travel_end_date: "",
    booking_date: todayIso(),
    pax_count: 1,
    selling_price: "",
    gst_billing: true,
    notes: "",
  });

  /* Prefill when opened with a lead */
  useEffect(() => {
    if (!open || !lead) return;
    const itin = allItineraries.find((i: any) => i.id === lead.itinerary_id);
    const start = lead.travel_date || "";
    const end = start && itin?.nights ? addDays(start, Number(itin.nights)) : "";
    setForm({
      destination_id: lead.destination_id || "",
      itinerary_id: lead.itinerary_id || "",
      travel_start_date: start,
      travel_end_date: end,
      booking_date: todayIso(),
      pax_count: Number(lead.pax_count) || 1,
      selling_price: "",
      gst_billing: true,
      notes: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id, allItineraries.length]);

  const filteredItineraries = useMemo(
    () => (form.destination_id
      ? allItineraries.filter((i: any) => i.destination_id === form.destination_id)
      : allItineraries),
    [form.destination_id, allItineraries]
  );

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  /* When itinerary changes, auto-compute end date from nights */
  const handleItineraryChange = (id: string) => {
    const itin = allItineraries.find((i: any) => i.id === id);
    setForm(prev => ({
      ...prev,
      itinerary_id: id,
      travel_end_date: prev.travel_start_date && itin?.nights
        ? addDays(prev.travel_start_date, Number(itin.nights))
        : prev.travel_end_date,
    }));
  };

  const handleStartDateChange = (date: string) => {
    const itin = allItineraries.find((i: any) => i.id === form.itinerary_id);
    setForm(prev => ({
      ...prev,
      travel_start_date: date,
      travel_end_date: date && itin?.nights ? addDays(date, Number(itin.nights)) : prev.travel_end_date,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!lead?.id) throw new Error("Missing lead");
      const payload: any = {
        lead_id: lead.id,
        traveller_code: lead.traveller_code,
        traveller_name: lead.name,
        destination_id: form.destination_id || null,
        itinerary_id: form.itinerary_id || null,
        travel_start_date: form.travel_start_date || null,
        travel_end_date: form.travel_end_date || null,
        booking_date: form.booking_date || null,
        pax_count: Number(form.pax_count) || 1,
        gst_billing: form.gst_billing,
        notes: form.notes || null,
        agreed_selling_price: form.selling_price ? Number(form.selling_price) : null,
        assigned_to: lead.assigned_to || null,
        status: "draft",
        trip_stage: "trip_sold",
        created_by: profile?.id || null,
        cashflow_code: "",
      };
      const { data, error } = await supabase
        .from("trip_cashflow")
        .insert(payload)
        .select("id, cashflow_code")
        .single();
      if (error) throw error;

      // Also patch the source lead so the "Current Enquiry" card reflects
      // what was just agreed (destination, itinerary, travel date, pax).
      const leadPatch: Record<string, any> = {};
      if (form.destination_id) leadPatch.destination_id = form.destination_id;
      if (form.itinerary_id) leadPatch.itinerary_id = form.itinerary_id;
      if (form.travel_start_date) leadPatch.travel_date = form.travel_start_date;
      if (form.pax_count) leadPatch.pax_count = Number(form.pax_count) || 1;
      if (Object.keys(leadPatch).length > 0) {
        await supabase.from("leads").update(leadPatch as any).eq("id", lead.id);
      }

      await supabase.from("lead_timeline").insert({
        lead_id: lead.id,
        actor_id: profile?.id || null,
        event_type: "cashflow_created",
        note: `Trip Cashflow ${data.cashflow_code} created — pending vendor & margin details`,
      });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead_trips", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["lead_trips"] });
      queryClient.invalidateQueries({ queryKey: ["lead_timeline", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["lead", lead?.id] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Cashflow ${data.cashflow_code} created`);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create cashflow"),
  });

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">Create Trip Cashflow</DialogTitle>
          <DialogDescription className="text-xs">
            Lead marked <span className="font-medium">File Closed</span>. Capture the agreed trip details now — vendors, margins & docs can be filled later by ops.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Traveller</Label>
            <div className="mt-1 text-sm font-medium">{lead.name}</div>
            <div className="text-[11px] text-muted-foreground font-mono">{lead.traveller_code}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Booking date</Label>
            <Input type="date" value={form.booking_date} onChange={e => setField("booking_date", e.target.value)} className="h-9 mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Destination</Label>
            <Select value={form.destination_id} onValueChange={v => setField("destination_id", v)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select destination" /></SelectTrigger>
              <SelectContent>
                {destinations.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Itinerary</Label>
            <Select value={form.itinerary_id} onValueChange={handleItineraryChange}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Select itinerary" /></SelectTrigger>
              <SelectContent>
                {filteredItineraries.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.headline}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Travel start</Label>
            <Input type="date" value={form.travel_start_date} onChange={e => handleStartDateChange(e.target.value)} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Travel end</Label>
            <Input type="date" value={form.travel_end_date} onChange={e => setField("travel_end_date", e.target.value)} className="h-9 mt-1" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Pax count</Label>
            <Input type="number" min={1} value={form.pax_count} onChange={e => setField("pax_count", Number(e.target.value) || 1)} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Final selling price (₹, agreed)</Label>
            <Input type="number" min={0} placeholder="e.g. 85000" value={form.selling_price} onChange={e => setField("selling_price", e.target.value)} className="h-9 mt-1" />
          </div>

          <div className="col-span-2 flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
            <div>
              <div className="text-sm font-medium">GST billing</div>
              <div className="text-[11px] text-muted-foreground">Toggle off if the trip is being billed without GST.</div>
            </div>
            <Switch checked={form.gst_billing} onCheckedChange={v => setField("gst_billing", v)} />
          </div>

          <div className="col-span-2">
            <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea value={form.notes} onChange={e => setField("notes", e.target.value)} rows={2} className="mt-1 text-sm" placeholder="Anything ops should know — advance received, special arrangements, etc." />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" className="rounded-md" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            Skip for now
          </Button>
          <Button className="rounded-md" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Create Cashflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}