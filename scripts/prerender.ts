/**
 * Post-build static prerender.
 *
 * The site is a client-rendered SPA, so the HTML a crawler receives before
 * JavaScript runs is the generic index.html shell — identical title,
 * description and no canonical on every route. This step writes a real
 * per-route HTML file into dist/ so Googlebot, social preview bots and AI
 * crawlers see the correct <title>, description, canonical, og:*, JSON-LD
 * and an H1 in the *initial* response.
 *
 * The SPA still hydrates on top: React mounts into #root and replaces the
 * prerendered body content with the live app.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { BASE_URL, fetchAllRoutes, type RouteEntry } from "./lib/siteContent";

const DIST = resolve("dist");
const SITE_NAME = "Adventourist";

/**
 * Hard cap so a growing database can never push the build past the
 * publish limits (50,000 files / 3 GiB). Routes beyond the cap keep
 * working as normal client-rendered pages and stay in the sitemap.
 */
const MAX_PRERENDER_PAGES = Number(process.env.MAX_PRERENDER_PAGES ?? 500);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Mirrors the <SEO /> component's title rule. */
function fullTitle(title: string): string {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
}

/** Remove a head tag the route is about to redefine. */
function dropTag(html: string, pattern: RegExp): string {
  return html.replace(pattern, "");
}

function buildHead(entry: RouteEntry): string {
  const title = fullTitle(entry.title);
  const url = `${BASE_URL}${entry.path}`;
  const image = entry.ogImage || `${BASE_URL}/site-images/bg-home-page.jpg`;
  const parts = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(entry.description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(entry.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:type" content="${entry.ogType ?? "website"}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(entry.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ];
  for (const schema of entry.schema ?? []) {
    parts.push(
      `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`,
    );
  }
  return parts.join("\n    ");
}

/**
 * Crawler-visible body content. React replaces this on mount, so it only
 * needs to carry the page's H1 and a short summary — not the whole UI.
 */
function buildBody(entry: RouteEntry): string {
  const intro = entry.intro?.trim() || entry.description;
  return [
    `<div data-prerendered="true">`,
    `<h1>${esc(entry.h1)}</h1>`,
    `<p>${esc(intro)}</p>`,
    `</div>`,
  ].join("");
}

function renderPage(template: string, entry: RouteEntry): string {
  let html = template;
  // Strip the sitewide fallbacks this route is replacing.
  html = dropTag(html, /\s*<title>[\s\S]*?<\/title>/);
  html = dropTag(html, /\s*<meta\s+name="description"[^>]*>/);
  html = dropTag(html, /\s*<meta\s+property="og:(title|description|url|image|type)"[^>]*>/g);
  html = dropTag(html, /\s*<meta\s+name="twitter:(title|description|image)"[^>]*>/g);
  html = dropTag(html, /\s*<link\s+rel="canonical"[^>]*>/g);

  html = html.replace("</head>", `  ${buildHead(entry)}\n  </head>`);
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${buildBody(entry)}</div>`,
  );
  return html;
}

function outputPath(routePath: string): string {
  const clean = routePath.replace(/^\/+|\/+$/g, "");
  return clean ? resolve(DIST, clean, "index.html") : resolve(DIST, "index.html");
}

function verify(html: string, entry: RouteEntry): string[] {
  const problems: string[] = [];
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/);
  const titles = html.match(/<title>/g)?.length ?? 0;
  if (!titleMatch) problems.push("missing <title>");
  else if (/Loading/i.test(titleMatch[1])) problems.push(`"Loading" title: ${titleMatch[1]}`);
  if (titles > 1) problems.push(`${titles} <title> tags`);

  const canonicals = html.match(/<link\s+rel="canonical"/g)?.length ?? 0;
  if (canonicals !== 1) problems.push(`${canonicals} canonical tags`);

  const descriptions = html.match(/<meta\s+name="description"/g)?.length ?? 0;
  if (descriptions !== 1) problems.push(`${descriptions} description tags`);

  if (!html.includes(`<h1>`)) problems.push("missing <h1>");
  return problems.map((p) => `${entry.path}: ${p}`);
}

async function main() {
  const templatePath = resolve(DIST, "index.html");
  if (!existsSync(templatePath)) {
    console.warn("[prerender] dist/index.html not found — skipping.");
    return;
  }
  const template = readFileSync(templatePath, "utf8");

  const all = await fetchAllRoutes();
  if (all.length > MAX_PRERENDER_PAGES) {
    console.warn(
      `[prerender] ${all.length} routes exceeds MAX_PRERENDER_PAGES=${MAX_PRERENDER_PAGES}; prerendering the first ${MAX_PRERENDER_PAGES}. The rest stay client-rendered.`,
    );
  }
  const routes = all.slice(0, MAX_PRERENDER_PAGES);

  const problems: string[] = [];
  for (const entry of routes) {
    const html = renderPage(template, entry);
    problems.push(...verify(html, entry));
    const out = outputPath(entry.path);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
  }

  if (problems.length) {
    console.error("[prerender] metadata problems detected:");
    problems.slice(0, 40).forEach((p) => console.error(`  - ${p}`));
    throw new Error(`[prerender] ${problems.length} metadata problem(s)`);
  }

  console.log(`[prerender] wrote ${routes.length} static HTML pages into dist/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});