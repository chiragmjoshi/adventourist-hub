import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AppLayout from "@/components/AppLayout";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-abyss text-white",
  admin: "bg-primary text-primary-foreground",
  sales: "bg-lagoon/20 text-lagoon",
  operations: "bg-purple-100 text-purple-700",
  finance: "bg-ridge/20 text-ridge",
};

const roles = [
  {
    name: "Super Admin", key: "super_admin",
    desc: "Full access to everything including financial data and user management",
    permissions: [
      { label: "View all leads and reports", allowed: true },
      { label: "Manage users and roles", allowed: true },
      { label: "View revenue and financial data", allowed: true },
      { label: "Manage vendors", allowed: true },
      { label: "Manage itineraries", allowed: true },
      { label: "Manage landing pages", allowed: true },
      { label: "Access settings", allowed: true },
      { label: "Export all data", allowed: true },
      { label: "View team performance", allowed: true },
    ],
  },
  {
    name: "Admin", key: "admin",
    desc: "Full access except cannot manage users or view company financials",
    permissions: [
      { label: "View all leads and reports", allowed: true },
      { label: "View revenue and financial data", allowed: true },
      { label: "Manage vendors", allowed: true },
      { label: "Manage itineraries", allowed: true },
      { label: "Manage landing pages", allowed: true },
      { label: "Export all data", allowed: true },
      { label: "View team performance", allowed: true },
      { label: "Manage users and roles", allowed: false },
      { label: "Access settings", allowed: false },
    ],
  },
  {
    name: "Sales", key: "sales",
    desc: "Can manage leads, view itineraries and landing pages",
    permissions: [
      { label: "View and manage own leads", allowed: true },
      { label: "View all leads (read)", allowed: true },
      { label: "View itineraries", allowed: true },
      { label: "View landing pages", allowed: true },
      { label: "View own performance", allowed: true },
      { label: "View revenue/financial data", allowed: false },
      { label: "Manage vendors", allowed: false },
      { label: "Manage users", allowed: false },
      { label: "Export data", allowed: false },
      { label: "View other agents' performance", allowed: false },
    ],
  },
  {
    name: "Operations", key: "operations",
    desc: "Can manage vendors, trip cashflow and itineraries",
    permissions: [
      { label: "View all leads (read only)", allowed: true },
      { label: "Manage vendors", allowed: true },
      { label: "Manage trip cashflow", allowed: true },
      { label: "Manage itineraries", allowed: true },
      { label: "View revenue data", allowed: true },
      { label: "Manage landing pages", allowed: false },
      { label: "Manage users", allowed: false },
      { label: "View attribution/platform data", allowed: false },
    ],
  },
  {
    name: "Finance", key: "finance",
    desc: "Can view all financial reports and trip cashflow",
    permissions: [
      { label: "View all trip cashflow", allowed: true },
      { label: "View revenue reports", allowed: true },
      { label: "View margin reports", allowed: true },
      { label: "Export financial data", allowed: true },
      { label: "Manage leads", allowed: false },
      { label: "Manage vendors", allowed: false },
      { label: "Manage itineraries", allowed: false },
      { label: "Manage users", allowed: false },
    ],
  },
];

const RoleManagementPage = () => {
  return (
    <AppLayout title="Role Management">
      <p className="text-sm text-muted-foreground mb-6">Define what each role can access</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {roles.map((r) => (
          <Card key={r.key} className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge className={`capitalize ${ROLE_COLORS[r.key]}`}>{r.name}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{r.desc}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {r.permissions.map((p) => (
                  <div key={p.label} className="flex items-center gap-2">
                    {p.allowed ? (
                      <Check className="h-3.5 w-3.5 text-ridge shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className={`text-xs ${p.allowed ? "" : "text-muted-foreground"}`}>{p.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            To modify role permissions, contact your system administrator. Role changes take effect on next login.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default RoleManagementPage;
