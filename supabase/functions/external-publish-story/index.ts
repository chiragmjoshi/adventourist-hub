// External Publishing API for travel stories.
// Auth: requires X-API-Key header matching EXTERNAL_PUBLISH_API_KEY secret.
// Kill switch: api_settings.external_publish_enabled must be true.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const cors = {
  ...corsHeaders,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function err(status: number, message: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // GET = health/status (still requires key)
  const providedKey = req.headers.get("x-api-key") ?? "";
  const expectedKey = Deno.env.get("EXTERNAL_PUBLISH_API_KEY") ?? "";
  if (!expectedKey) return err(500, "Server not configured");
  if (providedKey !== expectedKey) return err(401, "Invalid API key");

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Kill switch
  const { data: settings } = await admin
    .from("api_settings")
    .select("external_publish_enabled")
    .eq("id", true)
    .maybeSingle();
  if (!settings?.external_publish_enabled) {
    return err(403, "External publishing is disabled in Settings");
  }

  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ ok: true, enabled: true, message: "Ready to publish" }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (req.method !== "POST") return err(405, "Method not allowed");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return err(400, "Invalid JSON body");
  }

  const title = String(body.title ?? "").trim();
  const content_html = String(body.content_html ?? "").trim();
  if (!title) return err(400, "title is required");
  if (!content_html) return err(400, "content_html is required");
  if (title.length > 200) return err(400, "title too long (max 200)");

  const allowedCategories = ["travel-stories", "things-to-do", "destination-guides"];
  const category = allowedCategories.includes(body.category) ? body.category : "travel-stories";

  let slug = body.slug ? slugify(String(body.slug)) : slugify(title);
  if (!slug) slug = `story-${Date.now()}`;

  // Ensure slug uniqueness
  const { data: existing } = await admin
    .from("travel_stories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t: unknown) => String(t)).slice(0, 20)
    : [];
  const wordCount = content_html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.round(wordCount / 220));

  const row = {
    title,
    slug,
    excerpt: body.excerpt ? String(body.excerpt).slice(0, 400) : null,
    content_html,
    category,
    tags,
    author: body.author ? String(body.author).slice(0, 100) : "Team Adventourist",
    thumbnail_url: body.thumbnail_url ? String(body.thumbnail_url) : null,
    read_time_minutes: typeof body.read_time_minutes === "number" ? body.read_time_minutes : readTime,
    seo_title: body.seo_title ? String(body.seo_title).slice(0, 70) : null,
    seo_description: body.seo_description ? String(body.seo_description).slice(0, 170) : null,
    focus_keyword: body.focus_keyword ? String(body.focus_keyword).slice(0, 80) : null,
    status: "published",
    published_at: new Date().toISOString(),
  };

  const { data: inserted, error: insErr } = await admin
    .from("travel_stories")
    .insert(row)
    .select("id, slug, title")
    .single();

  if (insErr) return err(500, "Insert failed", { details: insErr.message });

  return new Response(
    JSON.stringify({
      ok: true,
      id: inserted.id,
      slug: inserted.slug,
      title: inserted.title,
      url: `https://www.adventourist.in/travel-stories/${inserted.slug}`,
    }),
    { status: 201, headers: { ...cors, "Content-Type": "application/json" } },
  );
});