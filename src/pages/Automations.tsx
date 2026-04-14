import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Settings, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { formatLabel } from "@/lib/formatLabel";
import { formatDistanceToNow } from "date-fns";

const Automations = () => {
  const [tab, setTab] = useState<"queue" | "log">("queue");

  const { data: queue = [], refetch: refetchQueue } = useQuery({
    queryKey: ["automations_queue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automations_log")
        .select("*, leads(name, traveller_code)")
        .in("status", ["pending", "failed"])
        .order("fired_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["automations_log"],
    queryFn: async () => {
      const { data } = await supabase
        .from("automations_log")
        .select("*, leads(name, traveller_code)")
        .order("fired_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const handleCancel = async (id: string) => {
    await supabase.from("automations_log").update({ status: "cancelled" }).eq("id", id);
    toast.success("Automation cancelled");
    refetchQueue();
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-700",
      sent: "bg-ridge/20 text-ridge",
      failed: "bg-destructive/20 text-destructive",
      cancelled: "bg-muted text-muted-foreground",
    };
    return <Badge className={`text-[10px] ${colors[status] || ""}`}>{formatLabel(status)}</Badge>;
  };

  const items = tab === "queue" ? queue : logs;

  return (
    <AppLayout title="Automations">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Button variant={tab === "queue" ? "default" : "outline"} size="sm" onClick={() => setTab("queue")}>
            Queue ({queue.length})
          </Button>
          <Button variant={tab === "log" ? "default" : "outline"} size="sm" onClick={() => setTab("log")}>
            Activity Log
          </Button>
        </div>
        <Link to="/settings?tab=automations">
          <Button variant="outline" size="sm">
            <Settings className="h-3.5 w-3.5 mr-1.5" />Configure Templates
          </Button>
        </Link>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="px-5 pt-4 pb-2">
          <CardTitle className="text-sm">{tab === "queue" ? "Pending & Failed Queue" : "Recent Activity"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">No automations {tab === "queue" ? "in queue" : "logged yet"}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                  {tab === "queue" && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs">{formatLabel(item.trigger_event)}</TableCell>
                    <TableCell className="text-xs font-mono">{item.template_name || "—"}</TableCell>
                    <TableCell>
                      {item.lead_id ? (
                        <Link to={`/leads/${item.lead_id}`} className="text-xs text-primary hover:underline">
                          {(item.leads as any)?.name || "Lead"}
                        </Link>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{item.channel}</Badge></TableCell>
                    <TableCell>{statusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.fired_at ? formatDistanceToNow(new Date(item.fired_at), { addSuffix: true }) : "—"}
                    </TableCell>
                    {tab === "queue" && (
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleCancel(item.id)}>
                          <XCircle className="h-3 w-3 mr-1" />Cancel
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Automations;
