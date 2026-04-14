import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

const AccessDenied = ({ pageName }: { pageName?: string }) => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <AppLayout title="Access Denied">
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">You don't have permission to view this page</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Your role ({profile?.role?.replace("_", " ")}) doesn't include access to {pageName || "this page"}.
        </p>
        <p className="text-sm text-muted-foreground mb-6">Contact your administrator if you need access.</p>
        <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
      </div>
    </AppLayout>
  );
};

export default AccessDenied;
