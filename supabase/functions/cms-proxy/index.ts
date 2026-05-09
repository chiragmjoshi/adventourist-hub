// Public CMS proxy — forwards requests to https://cms2.adventourist.in/api
// Bypasses CORS for the browser-side public site.

const CMS_BASE = "https://cms2.adventourist.in/api";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let path = url.searchParams.get("path") || "/itineraries";
    if (!path.startsWith("/")) path = "/" + path;

    // Forward any extra query params (besides `path`)
    const forwardParams = new URLSearchParams();
    url.searchParams.forEach((v, k) => {
      if (k !== "path") forwardParams.append(k, v);
    });
    const qs = forwardParams.toString();
    const target = `${CMS_BASE}${path}${qs ? (path.includes("?") ? "&" : "?") + qs : ""}`;

    const upstream = await fetch(target, {
      method: req.method,
      headers: { Accept: "application/json" },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Proxy error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});