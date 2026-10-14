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
import { BASE_URL, fetchAllRoutes, clamp, wrapBody, type RouteEntry } from "./lib/siteContent";

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
  const t = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  return t.length > 60 ? title : t;
}

/** Remove a head tag the route is about to redefine. */
function dropTag(html: string, pattern: RegExp): string {
  return html.replace(pattern, "");
}

function buildHead(entry: RouteEntry): string {
  const title = fullTitle(entry.title);
  entry = { ...entry, description: clamp(entry.description, 160) };
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
    `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
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
  if (entry.body) return `<div data-prerendered="true">${entry.body}</div>`;
  const intro = entry.intro?.trim() || entry.description;
  return [
    `<div data-prerendered="true">`,
    wrapBody(`<h1>${esc(entry.h1)}</h1><p>${esc(intro)}</p>`),
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
  html = dropTag(html, /\s*<meta\s+name="(robots|twitter:card)"[^>]*>/g);
  html = html.replace(/<!--(?!\[if)[\s\S]*?-->/g, "");

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

  const h1s = html.match(/<h1>/g)?.length ?? 0;
  if (h1s !== 1) problems.push(`${h1s} <h1> tags`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { problems.push("invalid JSON-LD"); } }
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

  // llms-full.txt — one section per destination / trip / story, canonical links.
  const sec = (label: string, prefix: string) =>
    [`## ${label}`, ...all.filter((e) => e.path.startsWith(prefix)).map((e) => `- [${e.h1}](${BASE_URL}${e.path}): ${clamp(e.description, 200)}`), ""].join("\n");
  writeFileSync(
    resolve(DIST, "llms-full.txt"),
    [
      "# Adventourist — full site index",
      "",
      "> Mumbai-based custom travel planner founded in 2018 by Minal Joshi. Vile Parle West, Mumbai 400056 · +91 99304 00694 · support@adventourist.in · Mon–Sat 9:00–21:00. Zero booking fees.",
      "",
      sec("Destinations", "/destinations/"),
      sec("Trips", "/trips/"),
      sec("Travel stories", "/travel-stories/"),
      "## Company pages", ...all.filter((e) => !/^\/(trips|destinations|travel-stories)\//.test(e.path)).map((e) => `- [${e.h1}](${BASE_URL}${e.path})`),
    ].join("\n"),
  );

  console.log(`[prerender] wrote ${routes.length} static HTML pages into dist/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});