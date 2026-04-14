import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, UserCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

const ROLES = ["super_admin", "admin", "sales", "operations", "finance"] as const;
const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-abyss text-white",
  admin: "bg-primary text-primary-foreground",
  sales: "bg-lagoon/20 text-lagoon",
  operations: "bg-purple-100 text-purple-700",
  finance: "bg-ridge/20 text-ridge",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full access to everything including financial data and user management",
  admin: "Full access except cannot manage users or view company financials",
  sales: "Can manage leads, view itineraries and landing pages. Cannot view revenue data.",
  operations: "Can manage vendors, trip cashflow and itineraries. Cannot view lead attribution.",
  finance: "Can view all financial reports and trip cashflow. Read-only access to leads.",
};

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "sales", mobile: "" });
  const [leadCounts, setLeadCounts] = useState<Record<string, number>>({});

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from("users").select("*").order("created_at", { ascending: false });
    setUsers(data || []);
    // Get lead counts
    const { data: leads } = await supabase.from("leads").select("assigned_to");
    const counts: Record<string, number> = {};
    (leads || []).forEach((l) => { if (l.assigned_to) counts[l.assigned_to] = (counts[l.assigned_to] || 0) + 1; });
    setLeadCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter((u) => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter === "active" && !u.is_active) return false;
    if (statusFilter === "inactive" && u.is_active) return false;
    return true;
  });

  const activeCount = users.filter((u) => u.is_active).length;

  const handleInvite = async () => {
    if (!inviteForm.name || !inviteForm.email) { toast.error("Name and email are required"); return; }
    const { error } = await supabase.from("users").insert({ name: inviteForm.name, email: inviteForm.email, role: inviteForm.role, is_active: false });
    if (error) { toast.error(error.message); return; }
    toast.success(`Invitation created for ${inviteForm.email}`);
    setInviteOpen(false);
    setInviteForm({ name: "", email: "", role: "sales" });
    fetchUsers();
  };

  const handleDeactivate = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    await supabase.from("users").update({ is_active: !user.is_active }).eq("id", userId);
    toast.success(user.is_active ? "User deactivated" : "User activated");
    fetchUsers();
  };

  return (
    <AppLayout title="User Management">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">{users.length} users · {activeCount} active</p>
        </div>
        <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
          <SheetTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Invite User</Button>
          </SheetTrigger>
          <SheetContent className="w-[400px]">
            <SheetHeader><SheetTitle>Invite Team Member</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-6">
              <div><Label>Full Name*</Label><Input value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Email Address*</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} /><p className="text-xs text-muted-foreground mt-1">An invitation will be sent to this email</p></div>
              <div>
                <Label>Role*</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div>
                          <p className="capitalize font-medium">{r.replace("_", " ")}</p>
                          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[r]}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleInvite}>Send Invite</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card><CardContent className="p-8"><div className="h-40 bg-muted animate-pulse rounded" /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16">
          <UserCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-1">No users found</h2>
          <p className="text-sm text-muted-foreground">Invite your first team member</p>
        </CardContent></Card>
      ) : (
        <Card className="border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Leads</TableHead><TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id} className={!u.is_active ? "opacity-60" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <p className={`text-sm font-medium ${!u.is_active ? "line-through" : ""}`}>{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={`capitalize text-[10px] ${ROLE_COLORS[u.role] || ""}`}>{u.role.replace("_", " ")}</Badge></TableCell>
                  <TableCell>
                    {!u.is_active ? (
                      <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-700">Pending Invite</Badge>
                    ) : (
                      <Badge variant="default" className="text-[10px] bg-ridge/20 text-ridge">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{leadCounts[u.id] || 0}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(u.id)}>{u.is_active ? "Deactivate" : "Activate"}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </AppLayout>
  );
};

export default UserManagementPage;
