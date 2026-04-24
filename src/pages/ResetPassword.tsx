import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Reset link is invalid or has expired");
        setTimeout(() => navigate("/login"), 1500);
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success("Password updated");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Reset your password</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Verifying link…</p>
          ) : (
            <>
              <div><Label>New password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <div><Label>Confirm password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>{submitting ? "Saving…" : "Update password"}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;