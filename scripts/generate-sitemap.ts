// Generates public/sitemap.xml at build/dev time.
// Includes static routes + all published itineraries + travel stories.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://www.adventourist.in";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? "https://ufjhiqdpshrubephgxrs.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

interface Entry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: Entry[] = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/trips", changefreq: "daily", priority: "0.9" },
  { loc: "/travel-stories", changefreq: "weekly", priority: "0.8" },
  { loc: "/about-us", changefreq: "monthly", priority: "0.7" },
  { loc: "/contact", changefreq: "monthly", priority: "0.7" },
  { loc: "/team", changefreq: "monthly", priority: "0.6" },
  { loc: "/faqs", changefreq: "monthly", priority: "0.6" },
  { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { loc: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
  { loc: "/refund-and-cancellation-policy", changefreq: "yearly", priority: "0.3" },
  { loc: "/payment-policy", changefreq: "yearly", priority: "0.3" },
];

async function fetchTable(
  table: string,
  select: string,
  filter: string,
): Promise<any[]> {
  if (!SUPABASE_ANON) return [];
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filter}`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`sitemap: ${table} fetch failed (${res.status})`);
      return [];
    }
    return (await res.json()) as any[];
  } catch (e) {
    console.warn(`sitemap: ${table} fetch error`, e);
    return [];
  }
}

function esc(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!),
  );
}

function render(entries: Entry[]) {
  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${esc(BASE_URL + e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const [trips, stories] = await Promise.all([
    fetchTable("itineraries", "slug,updated_at,published_at", "status=eq.published"),
    fetchTable("travel_stories", "slug,updated_at,published_at", "status=eq.published"),
  ]);

  const tripEntries: Entry[] = trips
    .filter((t) => t.slug)
    .map((t) => ({
      loc: `/trips/${t.slug}`,
      changefreq: "weekly" as const,
      priority: "0.85",
      lastmod: (t.updated_at ?? t.published_at ?? "").slice(0, 10) || undefined,
    }));

  const storyEntries: Entry[] = stories
    .filter((s) => s.slug)
    .map((s) => ({
      loc: `/travel-stories/${s.slug}`,
      changefreq: "monthly" as const,
      priority: "0.75",
      lastmod: (s.updated_at ?? s.published_at ?? "").slice(0, 10) || undefined,
    }));

  const all = [...staticEntries, ...tripEntries, ...storyEntries];
  writeFileSync(resolve("public/sitemap.xml"), render(all));
  console.log(
    `sitemap.xml written: ${all.length} entries (${staticEntries.length} static, ${tripEntries.length} trips, ${storyEntries.length} stories)`,
  );
}

main().catch((e) => {
  console.error("sitemap generation failed", e);
  // Don't break the build — fall back to static-only sitemap.
  writeFileSync(resolve("public/sitemap.xml"), render(staticEntries));
});