/**
 * Generates public/sitemap.xml at predev + prebuild time.
 * Routes come from scripts/lib/siteContent.ts — the same module the
 * postbuild prerenderer uses, so the sitemap and the prerendered HTML
 * can never drift apart.
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { BASE_URL, fetchAllRoutes, type RouteEntry } from "./lib/siteContent";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function render(entries: RouteEntry[]) {
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
  const all = await fetchAllRoutes();
  const xml = render(all);
  writeFileSync(resolve("public/sitemap.xml"), xml);
  const count = (prefix: string) =>
    all.filter((e) => e.path.startsWith(prefix) && e.path !== prefix).length;
  console.log(
    `[sitemap] wrote ${all.length} URLs (${count("/trips")} trips, ${count("/destinations")} destinations, ${count("/travel-stories")} stories)`,
  );
}

main().catch((e) => {
  console.error("[sitemap] fatal:", e);
  // Don't fail the build — keep whatever sitemap.xml already exists.
  process.exit(0);
});