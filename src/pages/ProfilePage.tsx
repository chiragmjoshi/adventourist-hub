import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const ProfilePage = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const handleChangePassword = async () => {
    if (!newPassword) { toast.error("Enter a new password"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated successfully");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <AppLayout title="Profile">
      <div className="max-w-xl mx-auto space-y-6">
        <Card className="border shadow-sm">
          <CardContent className="p-6 flex items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              <Badge variant="secondary" className="mt-1 capitalize">{profile?.role?.replace("_", " ")}</Badge>
              {user?.created_at && (
                <p className="text-xs text-muted-foreground mt-2">Member since {format(new Date(user.created_at), "MMM yyyy")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></div>
            <div><Label>Confirm New Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></div>
            <Button onClick={handleChangePassword} disabled={saving}>{saving ? "Saving..." : "Update Password"}</Button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full text-destructive border-destructive hover:bg-destructive/10" onClick={handleLogout}>
          Sign Out
        </Button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
