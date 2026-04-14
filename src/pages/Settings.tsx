import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const queryClient = useQueryClient();
  const [gstRate, setGstRate] = useState("");

  const { data: settings = [] } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => { const { data } = await supabase.from("settings").select("*"); return data || []; },
  });

  const getSetting = (key: string) => settings.find((s: any) => s.key === key)?.value || "";

  useEffect(() => { if (settings.length > 0) setGstRate(getSetting("gst_rate")); }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("settings").update({ value: gstRate, updated_at: new Date().toISOString() }).eq("key", "gst_rate");
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["settings"] }); toast.success("GST rate updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppLayout title="Settings">
      <h1 className="text-xl font-semibold mb-5">Settings</h1>

      <div className="max-w-2xl space-y-5">
        <Card className="border-border/50 shadow-none">
          <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Financial Settings</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5 space-y-4">
            <div className="max-w-xs">
              <Label className="text-xs text-muted-foreground">GST Rate (%)</Label>
              <Input type="number" value={gstRate} onChange={e => setGstRate(e.target.value)} className="mt-1 rounded-md" />
              <p className="text-[10px] text-muted-foreground mt-1">This rate applies to all GST-billed customer invoices. Update when government rate changes.</p>
            </div>
            <Button size="sm" className="rounded-md text-xs" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-3.5 w-3.5 mr-1" />Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-none">
          <CardHeader className="px-5 pt-4 pb-2"><CardTitle className="text-sm">Company Information</CardTitle></CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                ["Company Name", getSetting("company_name")],
                ["GST Number", getSetting("company_gst")],
                ["PAN", getSetting("company_pan")],
                ["Address", getSetting("company_address")],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium">{(value as string) || "—"}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-4">Contact support to update company details.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
