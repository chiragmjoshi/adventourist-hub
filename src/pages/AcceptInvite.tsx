import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Supabase parses the recovery/invite hash automatically on load
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        toast.error("Invite link is invalid or has expired");
        setTimeout(() => navigate("/admin/login"), 1500);
        return;
      }
      setEmail(data.session.user.email ?? null);
      setReady(true);
    });
  }, [navigate]);

  const handleSubmit = async () => {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    const { data: session } = await supabase.auth.getSession();
    const uid = session.session?.user.id;
    if (uid) {
      await supabase.from("users").update({ is_active: true }).eq("id", uid);
    }
    toast.success("Welcome aboard!");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set up your account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!ready ? (
            <p className="text-sm text-muted-foreground">Verifying your invite…</p>
          ) : (
            <>
              {email && <p className="text-sm text-muted-foreground">Setting password for <strong>{email}</strong></p>}
              <div>
                <Label>New password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Confirm password</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "Activate account"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;