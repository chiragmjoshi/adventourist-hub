import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2 } from "lucide-react";

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-publish-story`;

const SAMPLE_BODY = `{
  "title": "5 Hidden Gems in Ladakh You Must Visit",
  "slug": "hidden-gems-ladakh",
  "excerpt": "Beyond Pangong and Nubra, Ladakh has lesser-known wonders.",
  "content_html": "<h2>1. Hanle Village</h2><p>...</p>",
  "category": "destination-guides",
  "tags": ["ladakh", "offbeat"],
  "author": "Team Adventourist",
  "thumbnail_url": "https://...jpg",
  "seo_title": "Hidden Gems in Ladakh | Adventourist",
  "seo_description": "Discover Ladakh's lesser-known villages...",
  "focus_keyword": "hidden gems ladakh"
}`;

export default function ExternalApiTab() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("api_settings")
        .select("external_publish_enabled")
        .eq("id", true)
        .maybeSingle();
      setEnabled(!!data?.external_publish_enabled);
      setLoading(false);
    })();
  }, []);

  async function toggle(next: boolean) {
    setSaving(true);
    const { error } = await supabase
      .from("api_settings")
      .update({ external_publish_enabled: next })
      .eq("id", true);
    setSaving(false);
    if (error) {
      toast.error("Failed: " + error.message);
      return;
    }
    setEnabled(next);
    toast.success(next ? "External publishing enabled" : "External publishing disabled");
  }

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-none">
        <CardHeader className="px-5 pt-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-sm">External Publishing API</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Allow Claude / any external tool to publish travel stories via API.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={enabled ? "bg-ridge/20 text-ridge text-[10px]" : "bg-muted text-muted-foreground text-[10px]"}>
              {enabled ? "ON" : "OFF"}
            </Badge>
            <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} />
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Endpoint URL</p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted rounded-md px-3 py-2 break-all">{ENDPOINT}</code>
              <Button size="sm" variant="outline" onClick={() => copy(ENDPOINT, "Endpoint")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Required headers</p>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto">{`Content-Type: application/json
X-API-Key: <your EXTERNAL_PUBLISH_API_KEY>`}</pre>
            <p className="text-[11px] text-muted-foreground mt-1">
              The key is stored as a backend secret. To rotate it, update the <code>EXTERNAL_PUBLISH_API_KEY</code> secret in Cloud → Secrets.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Request body (POST)</p>
            <div className="flex gap-2">
              <pre className="flex-1 text-xs bg-muted rounded-md p-3 overflow-auto">{SAMPLE_BODY}</pre>
              <Button size="sm" variant="outline" onClick={() => copy(SAMPLE_BODY, "Sample body")}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Required: <code>title</code>, <code>content_html</code>. Everything else optional.
              Category must be one of: <code>travel-stories</code>, <code>things-to-do</code>, <code>destination-guides</code>.
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">cURL example</p>
            <pre className="text-xs bg-muted rounded-md p-3 overflow-auto">{`curl -X POST '${ENDPOINT}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: YOUR_KEY' \\
  -d '${SAMPLE_BODY.replace(/\n/g, "")}'`}</pre>
          </div>

          <div className="rounded-md border border-blaze/30 bg-blaze/5 p-3 text-xs text-foreground">
            <strong>Kill switch:</strong> Flip the toggle above off and the endpoint immediately starts returning <code>403 disabled</code> — no need to rotate the key.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}