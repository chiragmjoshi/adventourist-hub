import AppLayout from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

const PlaceholderPage = ({ title }: { title: string }) => (
  <AppLayout title={title}>
    <Card className="border shadow-sm">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <Construction className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground">Coming soon in the next sprint</p>
      </CardContent>
    </Card>
  </AppLayout>
);

// Itineraries is now a full page - see ItineraryList.tsx
export const LandingPages = () => <PlaceholderPage title="Landing Pages" />;
export const Reports = () => <PlaceholderPage title="Reports" />;
export const UserManagement = () => <PlaceholderPage title="User Management" />;
export const RoleManagement = () => <PlaceholderPage title="Role Management" />;
