/**
 * Generates public/sitemap.xml at predev + prebuild time.
 * Pulls published itineraries + travel stories from Supabase so
 * every commercial page is discoverable by Googlebot.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.adventourist.in";
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://ufjhiqdpshrubephgxrs.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmamhpcWRwc2hydWJlcGhneHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTQxNTksImV4cCI6MjA5MTczMDE1OX0.dTstHqJ8EXqL71fQiTcbE8RVOMachuMSg0cvf61g5bo";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/trips", changefreq: "daily", priority: "0.9" },
  { path: "/destinations", changefreq: "weekly", priority: "0.9" },
  { path: "/travel-agency-mumbai", changefreq: "monthly", priority: "0.9" },
  { path: "/travel-stories", changefreq: "weekly", priority: "0.8" },
  { path: "/about-us", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/faqs", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
  { path: "/refund-and-cancellation-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/payment-policy", changefreq: "yearly", priority: "0.3" },
];

async function fetchTable(table: string, query: string): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`[sitemap] ${table} fetch failed: ${res.status}`);
      return [];
    }
    return (await res.json()) as any[];
  } catch (e) {
    console.warn(`[sitemap] ${table} fetch error:`, e);
    return [];
  }
}

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(entries: Entry[]) {
  const urls = entries.map((e) => {
    const lines = [
      "  <url>",
      `    <loc>${BASE_URL}${xmlEscape(e.path)}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : "",
      e.priority ? `    <priority>${e.priority}</priority>` : "",
      "  </url>",
    ].filter(Boolean);
    return lines.join("\n");
  });
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
    "",
  ].join("\n");
}

async function main() {
  const [trips, stories, dests] = await Promise.all([
    fetchTable("itineraries", "select=slug,updated_at&status=eq.published&order=updated_at.desc"),
    fetchTable("travel_stories", "select=slug,updated_at&status=eq.published&order=updated_at.desc"),
    fetchTable("destinations", "select=slug,updated_at&is_active=eq.true&order=name.asc"),
  ]);

  const tripEntries: Entry[] = trips
    .filter((t) => t.slug)
    .map((t) => ({
      path: `/trips/${t.slug}`,
      lastmod: t.updated_at ? new Date(t.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.8",
    }));

  const storyEntries: Entry[] = stories
    .filter((s) => s.slug)
    .map((s) => ({
      path: `/travel-stories/${s.slug}`,
      lastmod: s.updated_at ? new Date(s.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "monthly",
      priority: "0.6",
    }));

  const destEntries: Entry[] = dests
    .filter((d) => d.slug)
    .map((d) => ({
      path: `/destinations/${d.slug}`,
      lastmod: d.updated_at ? new Date(d.updated_at).toISOString().slice(0, 10) : undefined,
      changefreq: "weekly",
      priority: "0.75",
    }));

  const all = [...staticEntries, ...tripEntries, ...destEntries, ...storyEntries];
  const xml = render(all);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(
    `[sitemap] wrote ${all.length} URLs (${tripEntries.length} trips, ${destEntries.length} destinations, ${storyEntries.length} stories)`,
  );
}

main().catch((e) => {
  console.error("[sitemap] fatal:", e);
  // Don't fail the build — keep whatever sitemap.xml already exists.
  process.exit(0);
});