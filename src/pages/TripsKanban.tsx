import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { GripVertical, Calendar, User } from "lucide-react";

const STAGES = [
  { key: "trip_sold",              label: "Trip Sold",              color: "hsl(var(--blaze))" },
  { key: "booking_reconfirmation", label: "Booking Reconfirmation", color: "hsl(var(--horizon))" },
  { key: "briefing_call",          label: "Briefing Call",          color: "hsl(var(--lagoon))" },
  { key: "on_tour_support",        label: "On Tour Support",        color: "#3b82f6" },
  { key: "feedback_call",          label: "Feedback Call",          color: "#a855f7" },
  { key: "trip_completed",         label: "Trip Completed",         color: "hsl(var(--ridge))" },
];

const TripsKanban = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips_kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_cashflow")
        .select("id, cashflow_code, traveller_name, traveller_code, travel_start, travel_end, trip_stage, status, destinations(name), users:assigned_to(name)")
        .neq("status", "cancelled")
        .order("travel_start", { ascending: true });
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    STAGES.forEach((s) => (map[s.key] = []));
    trips.forEach((t: any) => {
      const k = t.trip_stage || "trip_sold";
      (map[k] = map[k] || []).push(t);
    });
    return map;
  }, [trips]);

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("trip_cashflow").update({ trip_stage: stage } as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["trips_kanban"] });
      const prev = queryClient.getQueryData<any[]>(["trips_kanban"]);
      queryClient.setQueryData(["trips_kanban"], (old: any[] = []) =>
        old.map((t) => (t.id === id ? { ...t, trip_stage: stage } : t)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["trips_kanban"], ctx.prev);
      toast.error("Failed to move trip");
    },
    onSuccess: () => toast.success("Trip stage updated"),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["trips_kanban"] }),
  });

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setOverStage(stage);
  };
  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    setDraggingId(null);
    setOverStage(null);
    if (!id) return;
    const trip = trips.find((t: any) => t.id === id);
    if (!trip || trip.trip_stage === stage) return;
    moveStage.mutate({ id, stage });
  };

  return (
    <AppLayout title="Trips Kanban">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold">Trips Kanban</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track trip closure workflow · {trips.length} active</p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {STAGES.map((stage) => {
            const list = grouped[stage.key] || [];
            const isOver = overStage === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={(e) => onDragOver(e, stage.key)}
                onDrop={(e) => onDrop(e, stage.key)}
                onDragLeave={() => setOverStage(null)}
                className={`w-[280px] flex-shrink-0 rounded-lg bg-muted/30 border transition-colors ${
                  isOver ? "border-primary bg-primary/5" : "border-border/50"
                }`}
              >
                <div className="px-3 py-2.5 border-b border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold uppercase tracking-wider">{stage.label}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded">{list.length}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[200px]">
                  {isLoading && <p className="text-xs text-muted-foreground text-center py-6">Loading...</p>}
                  {!isLoading && list.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Drop trips here</p>
                  )}
                  {list.map((t: any) => (
                    <Card
                      key={t.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, t.id)}
                      onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                      onClick={() => navigate(`/admin/trip-cashflow/${t.id}`)}
                      className={`p-2.5 cursor-move shadow-none border-border/60 hover:border-primary/40 hover:shadow-sm transition-all ${
                        draggingId === t.id ? "opacity-40" : ""
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[13px] font-medium truncate">{t.traveller_name || "—"}</span>
                          </div>
                          <div className="text-[11px] font-mono text-primary mt-0.5">{t.cashflow_code}</div>
                          {t.destinations?.name && (
                            <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0 bg-[hsl(var(--lagoon))]/10 text-[hsl(var(--lagoon))] border-0 rounded">
                              {t.destinations.name}
                            </Badge>
                          )}
                          {(t.travel_start || t.travel_end) && (
                            <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {t.travel_start ? format(new Date(t.travel_start), "dd MMM") : "?"}
                              {t.travel_end ? ` – ${format(new Date(t.travel_end), "dd MMM yyyy")}` : ""}
                            </div>
                          )}
                          {t.users?.name && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                              <User className="h-3 w-3" />{t.users.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default TripsKanban;