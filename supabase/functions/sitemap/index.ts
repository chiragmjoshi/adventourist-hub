import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const BASE = "https://adventourist.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const xmlHeaders = {
  ...corsHeaders,
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
};

interface UrlEntry {
  loc: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
  lastmod?: string;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );
}

function renderSitemap(urls: UrlEntry[]): string {
  const body = urls
    .map((u) => {
      const parts = [`    <loc>${escapeXml(u.loc)}</loc>`];
      if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (typeof u.priority === "number")
        parts.push(`    <priority>${u.priority.toFixed(2)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const statics: UrlEntry[] = [
    { loc: `${BASE}/`, changefreq: "weekly", priority: 1.0 },
    { loc: `${BASE}/trips`, changefreq: "daily", priority: 0.9 },
    { loc: `${BASE}/travel-stories`, changefreq: "weekly", priority: 0.8 },
    { loc: `${BASE}/about-us`, changefreq: "monthly", priority: 0.7 },
    { loc: `${BASE}/contact`, changefreq: "monthly", priority: 0.7 },
    { loc: `${BASE}/faqs`, changefreq: "monthly", priority: 0.6 },
  ];

  try {
    const [{ data: trips }, { data: stories }] = await Promise.all([
      supabase
        .from("itineraries")
        .select("slug, published_at, updated_at")
        .eq("status", "published"),
      supabase
        .from("stories")
        .select("slug, published_at, updated_at")
        .eq("is_published", true),
    ]);

    const tripUrls: UrlEntry[] = (trips ?? []).map((t: any) => ({
      loc: `${BASE}/trips/${t.slug}`,
      changefreq: "weekly",
      priority: 0.85,
      lastmod: (t.updated_at ?? t.published_at ?? new Date().toISOString()).slice(0, 10),
    }));

    const storyUrls: UrlEntry[] = (stories ?? []).map((s: any) => ({
      loc: `${BASE}/travel-stories/${s.slug}`,
      changefreq: "monthly",
      priority: 0.75,
      lastmod: (s.updated_at ?? s.published_at ?? new Date().toISOString()).slice(0, 10),
    }));

    return new Response(renderSitemap([...statics, ...tripUrls, ...storyUrls]), {
      headers: xmlHeaders,
    });
  } catch (err) {
    console.error("sitemap error", err);
    return new Response(renderSitemap(statics), { headers: xmlHeaders });
  }
});