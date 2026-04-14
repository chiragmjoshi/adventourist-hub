import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Save, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import { useRBAC } from "@/hooks/useRBAC";
import { toast } from "sonner";
import { formatLabel } from "@/lib/formatLabel";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-abyss text-white",
  admin: "bg-primary text-primary-foreground",
  sales: "bg-lagoon/20 text-lagoon",
  operations: "bg-purple-100 text-purple-700",
  finance: "bg-ridge/20 text-ridge",
};

const ROLE_ORDER = ["super_admin", "admin", "sales", "operations", "finance"];

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: "Full access to everything including financial data and user management",
  admin: "Full access except cannot manage users or view company financials",
  sales: "Can manage leads, view itineraries and landing pages",
  operations: "Can manage vendors, trip cashflow and itineraries",
  finance: "Can view all financial reports and trip cashflow",
};

const PERMISSION_LABELS: Record<string, string> = {
  view_leads: "View all leads",
  manage_leads: "Manage leads (create/edit)",
  view_reports: "View reports",
  view_revenue: "View revenue & financial data",
  manage_users: "Manage users and roles",
  manage_vendors: "Manage vendors",
  manage_itineraries: "Manage itineraries",
  manage_landing_pages: "Manage landing pages",
  access_settings: "Access settings",
  export_data: "Export all data",
  view_team_performance: "View team performance",
  manage_cashflow: "Manage trip cashflow",
  view_automations: "View & manage automations",
};

const RoleManagementPage = () => {
  const queryClient = useQueryClient();
  const { hasRole } = useRBAC();
  const isSuperAdmin = hasRole("super_admin");

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["role_permissions"],
    queryFn: async () => {
      const { data } = await supabase.from("role_permissions").select("*").order("role").order("permission");
      return (data || []) as any[];
    },
  });

  // Local edits state: { "role:permission": enabled }
  const [edits, setEdits] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (permissions.length > 0) {
      const map: Record<string, boolean> = {};
      permissions.forEach((p: any) => { map[`${p.role}:${p.permission}`] = p.enabled; });
      setEdits(map);
      setDirty(new Set());
    }
  }, [permissions]);

  const togglePermission = (role: string, permission: string) => {
    const key = `${role}:${permission}`;
    setEdits(prev => ({ ...prev, [key]: !prev[key] }));
    setDirty(prev => new Set(prev).add(role));
  };

  const saveRole = useMutation({
    mutationFn: async (role: string) => {
      const permKeys = Object.keys(PERMISSION_LABELS);
      for (const perm of permKeys) {
        const key = `${role}:${perm}`;
        const enabled = edits[key] ?? false;
        await supabase.from("role_permissions")
          .update({ enabled })
          .eq("role", role)
          .eq("permission", perm);
      }
    },
    onSuccess: (_data, role) => {
      queryClient.invalidateQueries({ queryKey: ["role_permissions"] });
      setDirty(prev => { const n = new Set(prev); n.delete(role); return n; });
      toast.success(`Permissions updated for ${formatLabel(role)}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Group permissions by role
  const rolePerms = (role: string) => {
    return Object.keys(PERMISSION_LABELS).map(perm => ({
      permission: perm,
      label: PERMISSION_LABELS[perm],
      enabled: edits[`${role}:${perm}`] ?? false,
    }));
  };

  return (
    <AppLayout title="Role Management">
      <p className="text-sm text-muted-foreground mb-6">Define what each role can access</p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
          {ROLE_ORDER.map((role) => (
            <Card key={role} className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`capitalize ${ROLE_COLORS[role]}`}>
                    {role === "super_admin" && <Crown className="h-3 w-3 mr-1" />}
                    {formatLabel(role)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[role]}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rolePerms(role).map((p) => (
                    <div key={p.permission} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {p.enabled ? (
                          <Check className="h-3.5 w-3.5 text-ridge shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span className={`text-xs ${p.enabled ? "" : "text-muted-foreground"}`}>{p.label}</span>
                      </div>
                      {isSuperAdmin && (
                        <Switch
                          checked={p.enabled}
                          onCheckedChange={() => togglePermission(role, p.permission)}
                          className="scale-75"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {isSuperAdmin && dirty.has(role) && (
                  <Button
                    size="sm"
                    className="mt-4 w-full text-xs"
                    onClick={() => saveRole.mutate(role)}
                    disabled={saveRole.isPending}
                  >
                    <Save className="h-3.5 w-3.5 mr-1" />Save Changes
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            {isSuperAdmin
              ? "Toggle permissions and click Save. Changes take effect on next login."
              : "To modify role permissions, contact your system administrator. Role changes take effect on next login."
            }
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default RoleManagementPage;
