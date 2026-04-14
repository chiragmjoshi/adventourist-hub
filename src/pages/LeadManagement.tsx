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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  new_lead: "bg-chart-3/20 text-chart-3 border-chart-3/30",
  contacted: "bg-chart-2/20 text-chart-2 border-chart-2/30",
  qualified: "bg-lagoon/20 text-lagoon border-lagoon/30",
  proposal_sent: "bg-chart-1/20 text-chart-1 border-chart-1/30",
  negotiation: "bg-horizon/20 text-horizon border-horizon/30",
  closed_won: "bg-ridge/20 text-ridge border-ridge/30",
  closed_lost: "bg-destructive/20 text-destructive border-destructive/30",
};

const LeadManagement = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "", email: "", mobile: "", sales_status: "new_lead", disposition: "not_contacted", notes: "",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, destinations(name), users!leads_assigned_to_fkey(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createLead = useMutation({
    mutationFn: async (newLead: typeof form) => {
      const code = `TRV-${String(Date.now()).slice(-6)}`;
      const { error } = await supabase.from("leads").insert({
        traveller_code: code,
        name: newLead.name,
        email: newLead.email || null,
        mobile: newLead.mobile || null,
        sales_status: newLead.sales_status,
        disposition: newLead.disposition,
        notes: newLead.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setDialogOpen(false);
      setForm({ name: "", email: "", mobile: "", sales_status: "new_lead", disposition: "not_contacted", notes: "" });
      toast.success("Lead created successfully");
    },
    onError: () => toast.error("Failed to create lead"),
  });

  const filtered = leads.filter((l: any) => {
    const matchSearch = l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.traveller_code?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.sales_status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppLayout title="Lead Management">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new_lead">New Lead</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Lead</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create New Lead</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); createLead.mutate(form); }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Mobile</Label>
                  <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Sales Status</Label>
                  <Select value={form.sales_status} onValueChange={(v) => setForm({ ...form, sales_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_lead">New Lead</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createLead.isPending}>
                {createLead.isPending ? "Creating..." : "Create Lead"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-table">Code</TableHead>
                <TableHead className="text-table">Name</TableHead>
                <TableHead className="text-table">Destination</TableHead>
                <TableHead className="text-table">Status</TableHead>
                <TableHead className="text-table">Disposition</TableHead>
                <TableHead className="text-table">Assigned To</TableHead>
                <TableHead className="text-table">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No leads found</TableCell></TableRow>
              ) : (
                filtered.map((lead: any) => (
                  <TableRow key={lead.id} className="hover:bg-muted/30 cursor-pointer">
                    <TableCell className="text-table font-mono">{lead.traveller_code}</TableCell>
                    <TableCell className="text-table font-medium">{lead.name}</TableCell>
                    <TableCell className="text-table">{lead.destinations?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] capitalize ${statusColors[lead.sales_status] ?? ""}`}>
                        {lead.sales_status?.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-table capitalize">{lead.disposition?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-table">{(lead as any).users?.name ?? "Unassigned"}</TableCell>
                    <TableCell className="text-table text-muted-foreground">
                      {lead.created_at ? format(new Date(lead.created_at), "dd MMM yyyy") : "—"}
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

export default LeadManagement;
