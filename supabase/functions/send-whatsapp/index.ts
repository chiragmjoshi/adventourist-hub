import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatMobile(mobile: string): string {
  let c = mobile.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "");
  if (c.startsWith("91") && c.length === 12) return c;
  if (c.startsWith("0")) c = c.substring(1);
  return "91" + c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service-role client to read API key + verify role
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userRow } = await admin.from("users").select("role,is_active").eq("id", claims.claims.sub).maybeSingle();
    if (!userRow?.is_active) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const allowedRoles = ["super_admin", "admin", "sales", "operations"];
    if (!allowedRoles.includes(userRow.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const { templateName, mobile, variables = [], userName = "Adventourist", testOnly = false, overrideApiKey } = body ?? {};

    if (!testOnly && (!templateName || !mobile)) {
      return new Response(JSON.stringify({ error: "templateName and mobile required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only super_admin/admin may pass overrideApiKey (used by Settings "test" button before saving)
    let apiKey: string | undefined;
    if (overrideApiKey && (userRow.role === "super_admin" || userRow.role === "admin")) {
      apiKey = overrideApiKey;
    } else {
      const { data: setting } = await admin.from("automation_settings").select("value").eq("key", "aisensy_api_key").maybeSingle();
      apiKey = setting?.value;
    }
    if (!apiKey || apiKey === "REPLACE_WITH_YOUR_API_KEY") {
      return new Response(JSON.stringify({ success: false, error: "AiSensy API key not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (testOnly) {
      // Just validate key shape; AiSensy has no auth-only endpoint, so return success if key present
      return new Response(JSON.stringify({ success: true, message: "API key present" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = {
      apiKey,
      campaignName: templateName,
      destination: formatMobile(mobile),
      userName,
      templateParams: Array.isArray(variables) ? variables.map(String) : [],
      source: "adventourist-crm",
    };

    const resp = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify({ success: resp.ok, response: data }), {
      status: resp.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
