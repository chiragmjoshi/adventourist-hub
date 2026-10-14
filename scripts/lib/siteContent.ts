import { readFileSync } from "fs";
import { resolve } from "path";
import { GUIDES, monthGrid, MONTH_NAMES } from "./destinationGuides";
/**
 * Single source of truth for the public route list + per-route metadata.
 *
 * Consumed by:
 *   - scripts/generate-sitemap.ts  (predev / prebuild)
 *   - scripts/prerender.ts         (postbuild static HTML snapshots)
 *
 * Keeping both on one module guarantees the sitemap and the prerendered
 * files can never drift apart.
 */

export const BASE_URL = "https://www.adventourist.in";

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://ufjhiqdpshrubephgxrs.supabase.co";
const SUPABASE_ANON =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmamhpcWRwc2hydWJlcGhneHJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNTQxNTksImV4cCI6MjA5MTczMDE1OX0.dTstHqJ8EXqL71fQiTcbE8RVOMachuMSg0cvf61g5bo";

const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
const DEFAULT_BUCKET = "itinerary-images";
const DEFAULT_OG_IMAGE = `${BASE_URL}/site-images/bg-home-page.jpg`;

export interface RouteEntry {
  path: string;
  /** Sitemap hints */
  lastmod?: string;
  changefreq?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: string;
  /** Prerender metadata — mirrors what <SEO /> emits client-side. */
  title: string;
  description: string;
  ogImage?: string;
  /** Social title, distinct from <title>. */
  ogTitle?: string;
  ogImageAlt?: string;
  /** Markdown block for llms-full.txt. */
  llms?: string;
  ogType?: "website" | "article";
  schema?: Record<string, unknown>[];
  /** Visible H1 + intro written into the prerendered body. */
  h1: string;
  intro?: string;
  /** Full crawler-visible body HTML (already escaped / sanitised). */
  body?: string;
}

/* ── body HTML helpers ───────────────────────────────────────────────── */

export function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Keep only safe structural tags from CMS rich text; drop editor junk. */
export function cleanRichHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, "")
    .replace(/<span class="ql-ui"[^>]*><\/span>/g, "")
    .replace(/<(\/?)(h[1-6]|p|ul|ol|li|strong|em|b|i|a|br|blockquote|table|thead|tbody|tr|td|th)(\s[^>]*)?>/gi, (_m, sl, tag, attrs) => {
      tag = tag.toLowerCase();
      if (tag === "h1") tag = "h2";
      if (sl) return `</${tag}>`;
      if (tag === "a") {
        const href = /href="([^"]*)"/i.exec(attrs || "")?.[1];
        return href && !/^javascript:/i.test(href) ? `<a href="${href}">` : "<a>";
      }
      return `<${tag}>`;
    })
    .replace(/<(?!\/?(h[1-6]|p|ul|ol|li|strong|em|b|i|a|br|blockquote|table|thead|tbody|tr|td|th)\b)[^>]+>/gi, "")
    .replace(/<p>\s*(<br>)?\s*<\/p>/g, "")
    .trim();
}

function list(items: unknown): string {
  const arr = Array.isArray(items) ? items : [];
  const li = arr.map((x) => (typeof x === "string" ? x : (x as any)?.title || (x as any)?.text || "")).filter(Boolean);
  return li.length ? `<ul>${li.map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul>` : "";
}

function richOrList(v: unknown): string {
  if (typeof v === "string") return cleanRichHtml(v);
  return list(v);
}

function inr(n?: number | null): string {
  return n ? `₹${Number(n).toLocaleString("en-IN")}` : "";
}

/** Clamp to a max length at a word boundary. */
export function clamp(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,;:—-]\s*$/, "") + "…";
}

const NAV_LINKS = `<nav aria-label="Site"><ul><li><a href="/">Home</a></li><li><a href="/trips">Trips</a></li><li><a href="/destinations">Destinations</a></li><li><a href="/travel-stories">Travel Stories</a></li><li><a href="/about-us">About Us</a></li><li><a href="/faqs">FAQs</a></li><li><a href="/contact">Contact</a></li></ul></nav>`;
export const CONTACT_BLOCK = `<footer><p>Adventourist, Vile Parle West, Mumbai, Maharashtra 400056, India. Phone: <a href="tel:+919930400694">+91 99304 00694</a>. Email: <a href="mailto:support@adventourist.in">support@adventourist.in</a>. Open Monday–Saturday, 9:00–21:00.</p></footer>`;
export function wrapBody(inner: string): string {
  return `${NAV_LINKS}<main>${inner}</main>${CONTACT_BLOCK}`;
}

/* ── helpers ─────────────────────────────────────────────────────────── */

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Mirrors src/site/lib/api.ts getCMSImageUrl for build-time use. */
export function imageUrl(p?: string | null): string {
  if (!p) return DEFAULT_OG_IMAGE;
  if (p.startsWith("/site-images/") || p.startsWith("/assets/")) {
    // Social crawlers are most reliable with JPEG; local story/destination
    // covers ship as both .webp (page render) and .jpg (share preview).
    const share = p.startsWith("/site-images/stories/") ? p.replace(/\.webp$/, ".jpg") : p;
    return `${BASE_URL}${share}`;
  }
  if (p.startsWith("http")) return p;
  const clean = p.startsWith("/") ? p.slice(1) : p;
  return clean.includes("/")
    ? `${STORAGE_BASE}/${clean}`
    : `${STORAGE_BASE}/${DEFAULT_BUCKET}/${clean}`;
}

/**
 * Guards against dead / junk URLs ever re-entering the sitemap or prerender.
 * A slug must be a clean lower-case path segment — no feeds, no legacy blog
 * paths, no query strings, no absolute URLs.
 */
const BAD_SLUG = /(^$|\s|\?|#|\/|^https?:|feed|travel-blog|wp-|staging|replytocom)/i;

export function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && !BAD_SLUG.test(slug.trim());
}

function day(d?: string | null): string | undefined {
  if (!d) return undefined;
  const t = new Date(d);
  return isNaN(t.getTime()) ? undefined : t.toISOString().slice(0, 10);
}

async function fetchTable(table: string, query: string): Promise<any[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    });
    if (!res.ok) {
      console.warn(`[site-content] ${table} fetch failed: ${res.status}`);
      return [];
    }
    return (await res.json()) as any[];
  } catch (e) {
    console.warn(`[site-content] ${table} fetch error:`, e);
    return [];
  }
}

function warnDropped(kind: string, rows: any[]) {
  const dropped = rows.filter((r) => !isValidSlug(r?.slug));
  if (dropped.length) {
    console.warn(
      `[site-content] dropped ${dropped.length} invalid ${kind} slug(s):`,
      dropped.map((r) => r?.slug).slice(0, 10),
    );
  }
}

function crumbs(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${BASE_URL}${c.path}`,
    })),
  };
}

/* ── static routes ───────────────────────────────────────────────────── */

export const staticRoutes: RouteEntry[] = [
  {
    path: "/",
    changefreq: "weekly",
    priority: "1.0",
    title: "Custom Travel Planner in Mumbai | Adventourist",
    description:
      "Plan personalised family holidays, honeymoons and experiential trips with Adventourist — a Mumbai-based custom travel planner. Zero booking fees.",
    h1: "Custom Travel Planner in Mumbai",
    intro:
      "Adventourist plans personalised family holidays, honeymoons and experiential trips from Mumbai. No fixed packages — real experts, zero booking fees.",
  },
  {
    path: "/trips",
    changefreq: "daily",
    priority: "0.9",
    title: "All Trips & Itineraries — Adventourist",
    description:
      "Browse curated travel itineraries from Adventourist. Adventure trips, beach holidays, mountain treks, cultural journeys. Custom packages from Mumbai.",
    h1: "All Trips & Itineraries",
    schema: [crumbs([{ name: "Home", path: "/" }, { name: "Trips", path: "/trips" }])],
  },
  {
    path: "/destinations",
    changefreq: "weekly",
    priority: "0.9",
    title: "All Travel Destinations — Custom Trips from Mumbai",
    description:
      "37+ destinations we plan custom trips for from Mumbai — Bali, Ladakh, Thailand, Seychelles, Kashmir, Rajasthan and more. Zero booking fees.",
    h1: "All Travel Destinations",
    schema: [
      crumbs([{ name: "Home", path: "/" }, { name: "Destinations", path: "/destinations" }]),
    ],
  },
  {
    path: "/travel-agency-mumbai",
    changefreq: "monthly",
    priority: "0.9",
    title: "Travel Agency in Mumbai | Custom Trip Planner — Adventourist",
    description:
      "Mumbai-based travel agency planning custom holidays, honeymoons and international trips. 4.8★ rated · zero booking fees · WhatsApp planner.",
    h1: "Travel Agency in Mumbai",
    schema: [
      crumbs([
        { name: "Home", path: "/" },
        { name: "Travel Agency in Mumbai", path: "/travel-agency-mumbai" },
      ]),
    ],
  },
  {
    path: "/travel-stories",
    changefreq: "weekly",
    priority: "0.8",
    title: "Travel Stories & Inspiration — Adventourist",
    description:
      "Real travel stories and trip inspiration — Bali honeymoons, Ladakh adventures, Thailand escapes and Sri Lanka getaways from real travellers.",
    h1: "Travel Stories & Inspiration",
    schema: [
      crumbs([{ name: "Home", path: "/" }, { name: "Travel Stories", path: "/travel-stories" }]),
    ],
  },
  {
    path: "/about-us",
    changefreq: "monthly",
    priority: "0.7",
    title: "About Us — Adventourist | Mumbai's Premium Travel Company",
    description:
      "We are Adventourist — a Mumbai-based team of passionate explorers crafting expert-led, custom travel experiences. Meet our founders and discover our travel philosophy.",
    h1: "About Adventourist",
  },
  {
    path: "/contact",
    changefreq: "monthly",
    priority: "0.7",
    title: "Contact Us — Plan Your Trip with Adventourist",
    description:
      "Ready to travel? Contact Adventourist in Mumbai to plan your custom itinerary. WhatsApp, call, or email us — we respond within 24 hours.",
    h1: "Contact Adventourist",
  },
  {
    path: "/faqs",
    changefreq: "monthly",
    priority: "0.6",
    title: "Frequently Asked Questions — Adventourist Travel",
    description:
      "Answers to common questions about Adventourist's travel planning process, packages, pricing, cancellations, and how to book your custom trip.",
    h1: "Frequently Asked Questions",
  },
  {
    path: "/privacy-policy",
    changefreq: "yearly",
    priority: "0.3",
    title: "Privacy Policy — Adventourist",
    description:
      "Read Adventourist's privacy policy. How we collect, use, and protect your personal information when you use our travel planning services.",
    h1: "Privacy Policy",
  },
  {
    path: "/terms-and-conditions",
    changefreq: "yearly",
    priority: "0.3",
    title: "Terms & Conditions — Adventourist",
    description:
      "Terms and conditions for using Adventourist's travel planning services, website, and packages.",
    h1: "Terms & Conditions",
  },
  {
    path: "/refund-and-cancellation-policy",
    changefreq: "yearly",
    priority: "0.3",
    title: "Refund & Cancellation Policy — Adventourist",
    description:
      "Adventourist's refund and cancellation policy. Understand our terms for cancellations, changes, and refunds on travel bookings.",
    h1: "Refund & Cancellation Policy",
  },
  {
    path: "/payment-policy",
    changefreq: "yearly",
    priority: "0.3",
    title: "Payment Policy — Adventourist",
    description:
      "Learn about Adventourist's payment terms, accepted payment methods, and booking deposit requirements.",
    h1: "Payment Policy",
  },
];

/* ── dynamic routes ──────────────────────────────────────────────────── */

export async function fetchDynamicRoutes(): Promise<RouteEntry[]> {
  const [trips, stories, dests] = await Promise.all([
    fetchTable(
      "itineraries",
      "select=slug,headline,about,hero_image,price_per_person,seo_title,seo_description,updated_at,days,nights,best_months,themes,suitable_for,highlights,inclusions,exclusions,itinerary_days,faqs,destination_id&status=eq.published&order=updated_at.desc",
    ),
    fetchTable(
      "travel_stories",
      "select=slug,title,excerpt,content_html,thumbnail_url,author,published_at,seo_title,seo_description,updated_at&status=eq.published&order=updated_at.desc",
    ),
    fetchTable(
      "destinations",
      "select=id,slug,name,about,hero_image,seo_title,seo_description,updated_at,best_months,themes,suitable_for&is_active=eq.true&order=name.asc",
    ),
  ]);

  warnDropped("itinerary", trips);
  warnDropped("story", stories);
  warnDropped("destination", dests);

  const destById = new Map(dests.filter((d) => isValidSlug(d.slug)).map((d) => [d.id, d]));
  const liveTrips = trips.filter((t) => isValidSlug(t.slug));
  const tripsByDest = new Map<string, any[]>();
  for (const t of liveTrips) {
    if (!t.destination_id) continue;
    tripsByDest.set(t.destination_id, [...(tripsByDest.get(t.destination_id) ?? []), t]);
  }
  const tripLinks = (arr: any[]) =>
    arr.length ? `<ul>${arr.map((t) => `<li><a href="/trips/${t.slug}">${escHtml(t.headline)}</a>${t.price_per_person ? ` — from ${inr(t.price_per_person)} per person` : ""}</li>`).join("")}</ul>` : "";

  const tripEntries: RouteEntry[] = trips.filter((t) => isValidSlug(t.slug)).map((t) => {
    const url = `${BASE_URL}/trips/${t.slug}`;
    const about = stripHtml(t.about);
    const img = imageUrl(t.hero_image);
    const dest = destById.get(t.destination_id);
    const days: any[] = Array.isArray(t.itinerary_days) ? t.itinerary_days : [];
    const faqs: any[] = (Array.isArray(t.faqs) ? t.faqs : []).filter((f: any) => (f?.q || f?.question) && (f?.a || f?.answer));
    const duration = t.nights && t.days ? `${t.nights} nights / ${t.days} days` : "";
    const suits = (t.suitable_for ?? []).join(", ");
    const season = (t.best_months ?? []).join(", ");
    const summary = [
      `${t.headline} is a ${duration || "custom"} itinerary${dest ? ` in ${dest.name}` : ""}${suits ? `, ideal for ${suits.toLowerCase()}` : ""}.`,
      season ? `Best time to go: ${season}.` : "",
      t.price_per_person ? `Prices start from ${inr(t.price_per_person)} per person.` : "",
    ].filter(Boolean).join(" ");
    const ownFaqs = faqs.map((f: any) => ({ q: String(f.q ?? f.question), a: stripHtml(f.a ?? f.answer) }));
    const genFaqs = tripFaqs(t, dest, duration, season);
    const allFaqs = [...ownFaqs, ...genFaqs.filter((g) => !ownFaqs.some((o) => o.q.toLowerCase() === g.q.toLowerCase()))].slice(0, Math.max(6, ownFaqs.length));
    const related = (dest ? tripsByDest.get(dest.id) ?? [] : []).filter((x) => x.slug !== t.slug).slice(0, 3);
    const body = wrapBody([
      `<article>`,
      `<h1>${escHtml(t.headline)}</h1>`,
      `<p>${escHtml(summary)}</p>`,
      `<p>Last updated: ${day(t.updated_at) ?? ""}</p>`,
      about ? `<h2>About this trip</h2>${cleanRichHtml(t.about)}` : "",
      list(t.highlights) ? `<h2>Highlights</h2>${list(t.highlights)}` : "",
      days.length ? `<h2>Day-by-day itinerary</h2><ol>${days.map((d, i) => `<li><h3>Day ${i + 1}: ${escHtml(d?.title ?? "")}</h3><p>${escHtml(stripHtml(d?.detail ?? ""))}</p></li>`).join("")}</ol>` : "",
      richOrList(t.inclusions) ? `<h2>Inclusions</h2>${richOrList(t.inclusions)}` : "",
      richOrList(t.exclusions) ? `<h2>Exclusions</h2>${richOrList(t.exclusions)}` : "",
      suits ? `<h2>Who this trip suits</h2><p>${escHtml(suits)}</p>` : "",
      `<h2>How we customise this trip</h2><p>Every Adventourist itinerary is a starting point. Our Mumbai-based travel experts adjust dates, hotels, pace, activities and budget to suit your group, and you only pay for what you choose — with zero booking fees.</p>`,
      `<h2>Frequently asked questions</h2>${allFaqs.map((f) => `<h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p>`).join("")}`,
      dest ? `<h2>More about ${escHtml(dest.name)}</h2><p><a href="/destinations/${dest.slug}">${escHtml(dest.name)} travel guide</a></p>` : "",
      related.length ? `<h2>Related trips</h2>${tripLinks(related)}` : "",
      `<p><a href="/contact">Plan this trip with an Adventourist expert</a></p>`,
      `</article>`,
    ].join(""));
    const route = [...new Set(days.slice(1, -1).map((d) => String(d?.title ?? "").replace(/^(arrive|arrival|departure|day\s*\d+)[:\s-]*/i, "").split(/[–|,(]/)[0].trim()).filter((x) => x.length > 2 && x.length < 40))].slice(0, 2);
    const short = t.nights && t.days ? `${t.nights}N/${t.days}D` : "";
    const metaDesc = clamp(
      `${dest ? dest.name + " " : ""}${short} trip${t.price_per_person ? ` from ${inr(t.price_per_person)} per person` : ""}${route.length ? `: ${route.join(" & ")}` : ""}. Customised by Adventourist's Mumbai experts, zero booking fees.`,
      160,
    );
    const llmsSummary = [
      summary,
      about ? clamp(about, 220) : "",
      "Fully customisable by Adventourist's Mumbai team with zero booking fees.",
    ].filter(Boolean).join(" ");
    return {
      body,
      description: metaDesc,
      ogTitle: `${t.headline}${t.price_per_person ? ` · from ${inr(t.price_per_person)}` : ""}${dest ? ` | ${dest.name} trip` : ""}`,
      ogImageAlt: `Scenic view from the ${t.headline} itinerary${dest ? ` in ${dest.name}` : ""}`,
      llms: `### [${t.headline}](${url})\n- Duration: ${duration || "flexible"}\n- Starting price: ${t.price_per_person ? `${inr(t.price_per_person)} per person` : "on request"}\n- ${llmsSummary}`,
      path: `/trips/${t.slug}`,
      lastmod: day(t.updated_at),
      changefreq: "weekly" as const,
      priority: "0.8",
      title: `${t.headline} — Adventourist`,
      ogImage: img,
      h1: t.headline,
      intro: about.slice(0, 320),
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: t.headline,
          description: about.slice(0, 300),
          image: img,
          url,
          ...(suits ? { touristType: t.suitable_for } : {}),
          ...(days.length
            ? { itinerary: { "@type": "ItemList", numberOfItems: days.length, itemListElement: days.map((d, i) => ({ "@type": "ListItem", position: i + 1, name: `Day ${i + 1}: ${d?.title ?? ""}`, description: clamp(stripHtml(d?.detail ?? ""), 300) })) } }
            : {}),
          ...(t.price_per_person
            ? {
                offers: {
                  "@type": "Offer",
                  price: t.price_per_person,
                  priceCurrency: "INR",
                  availability: "https://schema.org/InStock",
                  url,
                },
              }
            : {}),
          provider: { "@type": "TravelAgency", "@id": `${BASE_URL}/#org`, name: "Adventourist", url: BASE_URL },
        },
        faqSchema(allFaqs),
        crumbs([
          { name: "Home", path: "/" },
          { name: "Trips", path: "/trips" },
          { name: t.headline, path: `/trips/${t.slug}` },
        ]),
      ],
    };
  });

  const liveStories = stories.filter((s) => isValidSlug(s.slug));
  const destEntries: RouteEntry[] = dests.filter((d) => isValidSlug(d.slug)).map((d) => buildDestination(d, tripsByDest.get(d.id) ?? [], liveStories));

  const storyEntries: RouteEntry[] = stories.filter((s) => isValidSlug(s.slug)).map((s) => {
    const url = `${BASE_URL}/travel-stories/${s.slug}`;
    const img = imageUrl(s.thumbnail_url);
    const author = s.author || "Adventourist Team";
    const body = wrapBody([
      `<article><h1>${escHtml(s.title)}</h1>`,
      `<p>By ${escHtml(author)} · Published ${day(s.published_at) ?? ""} · Last updated ${day(s.updated_at) ?? ""}</p>`,
      s.excerpt ? `<p>${escHtml(s.excerpt)}</p>` : "",
      cleanRichHtml(s.content_html),
      `<p><a href="/travel-stories">More travel stories</a> · <a href="/trips">Browse trips</a></p></article>`,
    ].join(""));
    return {
      body,
      path: `/travel-stories/${s.slug}`,
      lastmod: day(s.updated_at),
      changefreq: "monthly" as const,
      priority: "0.6",
      title: s.seo_title || `${s.title} — Adventourist`,
      description:
        s.seo_description || s.excerpt || `${s.title} — a travel story from Adventourist.`,
      ogImage: img,
      ogType: "article" as const,
      h1: s.title,
      intro: s.excerpt ?? undefined,
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: s.title,
          description: s.excerpt ?? undefined,
          image: img,
          url,
          datePublished: s.published_at ?? undefined,
          dateModified: s.updated_at ?? undefined,
          author: s.author ? { "@type": "Person", name: s.author } : { "@type": "Organization", name: "Adventourist", url: BASE_URL },
          publisher: { "@type": "Organization", "@id": `${BASE_URL}/#org`, name: "Adventourist", url: BASE_URL, logo: { "@type": "ImageObject", url: `${BASE_URL}/logo/logo-square-color.svg` } },
          mainEntityOfPage: url,
        },
        crumbs([
          { name: "Home", path: "/" },
          { name: "Travel Stories", path: "/travel-stories" },
          { name: s.title, path: `/travel-stories/${s.slug}` },
        ]),
      ],
    };
  });

  const pageEntries = buildCorePages(liveTrips, dests.filter((d) => isValidSlug(d.slug)), stories.filter((s) => isValidSlug(s.slug)));
  return [...pageEntries, ...tripEntries, ...destEntries, ...storyEntries];
}

/** Static + dynamic, de-duplicated by path. */
export async function fetchAllRoutes(): Promise<RouteEntry[]> {
  const dynamic = await fetchDynamicRoutes();
  const seen = new Set<string>();
  return [...dynamic, ...staticRoutes].filter((e) => {
    if (seen.has(e.path)) return false;
    seen.add(e.path);
    return true;
  });
}

/* ── FAQ + core page helpers ─────────────────────────────────────────── */

type QA = { q: string; a: string };

export function faqSchema(faqs: QA[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

const HIGH_ALTITUDE = /ladakh|leh|spiti|kailash|mansarovar|sikkim|bhutan|nepal|kashmir|himachal|uttarakhand|tibet/i;

/** Trip-specific FAQs built from the itinerary's own data. */
export function tripFaqs(t: any, dest: any, duration: string, season: string): QA[] {
  const place = dest?.name ?? t.headline;
  const ex = stripHtml(Array.isArray(t.exclusions) ? t.exclusions.join(", ") : t.exclusions);
  const high = HIGH_ALTITUDE.test(`${place} ${t.headline}`);
  return [
    { q: `What is the best time to do the ${t.headline} trip?`, a: season ? `The best months for this ${place} itinerary are ${season}. Our team can advise on weather, crowds and prices for your exact dates.` : `${place} can be visited across several seasons; our travel experts will recommend the best window for your dates, budget and interests.` },
    { q: `How difficult is this trip?`, a: high ? `This is a high-altitude itinerary, so the pace includes time to acclimatise. It suits most healthy travellers; anyone with heart, lung or blood-pressure conditions should consult a doctor before travelling.` : `This is an easy-paced ${duration || "custom"} trip suitable for most travellers, including families. We can slow the pace or add rest days on request.` },
    { q: `What is not included in the ${t.headline} package?`, a: ex ? clamp(`Not included: ${ex}.`, 400) : `Flights, visas, travel insurance, personal expenses and anything not listed under inclusions are quoted separately.` },
    { q: `Can I customise this itinerary?`, a: `Yes. Every Adventourist itinerary is a starting point — we change dates, hotels, activities, duration and budget to suit your group, with zero booking fees.` },
    { q: `What are the payment and cancellation terms?`, a: `A booking amount confirms your trip and the balance is due before departure. Cancellation charges depend on supplier terms and how close to travel you cancel; see ${BASE_URL}/refund-and-cancellation-policy and ${BASE_URL}/payment-policy for details.` },
    ...(t.price_per_person ? [{ q: `How much does the ${t.headline} trip cost?`, a: `Prices start from ${inr(t.price_per_person)} per person. The final price depends on dates, hotel category and group size.` }] : []),
  ];
}

const PILLARS: QA[] = [
  { q: "Personalised", a: "Every trip is built around your travel style, budget, and the people you're going with. No copy-paste itineraries." },
  { q: "Expert", a: "Talk directly to Minal, Pinky, or our team — people who have actually been where you want to go." },
  { q: "Transparent", a: "Zero booking fees. No hidden charges. No upsells. Just a fair price for a trip planned right." },
  { q: "With You", a: "Real humans on WhatsApp before, during, and after your journey. Not bots. Not scripts." },
];
const STEPS: QA[] = [
  { q: "Tell us what you're looking for", a: "Share your destination, travel dates, group size, and budget. Even if you're not sure — we'll help you figure it out." },
  { q: "We build your custom plan", a: "Your dedicated travel expert designs a day-by-day itinerary — handpicked stays, real local insights, and everything tailored to your group." },
  { q: "You show up. We handle everything.", a: "We book it all — stays, transfers, guides. And we're on WhatsApp throughout your trip if you need anything." },
];
const TESTIMONIALS: QA[] = [
  { q: "Lata Valera — Thailand", a: "Exceptional experience with Adventourist Travel Co. Everything was managed really well. From hotels to activities — all seamless. I highly recommend them if you're planning any vacation." },
  { q: "Joiston & Priya — Bali honeymoon", a: "Minal and the team are absolutely amazing. They were extremely patient, kind and attentive. From hotel bookings to planning, to making changes while in Bali — Adventourist were right by our side." },
  { q: "Pranit Jaiswal — Leh Ladakh", a: "The Ladakh trip was beyond expectations. Every detail was taken care of — permits, hotels in remote areas, the whole route was perfect. Will definitely book again." },
];
export const GOOGLE_PROFILE = "https://share.google/g1ahZlUqFBAPo2DAG";

function siteFaqs(): QA[] {
  try {
    const src = readFileSync(resolve("src/site/pages/FAQs.tsx"), "utf8");
    return [...src.matchAll(/q:\s*"((?:[^"\\]|\\.)*)",\s*a:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => ({ q: m[1].replace(/\\"/g, '"'), a: m[2].replace(/\\"/g, '"') }));
  } catch { return []; }
}

function buildCorePages(trips: any[], dests: any[], stories: any[]): RouteEntry[] {
  const home = staticRoutes.find((r) => r.path === "/")!;
  const about = staticRoutes.find((r) => r.path === "/about-us")!;
  const faqPage = staticRoutes.find((r) => r.path === "/faqs")!;
  const featured = trips.filter((t) => t.price_per_person).slice(0, 8);

  const homeBody = wrapBody([
    `<section><h1>${escHtml(home.h1)}</h1><p>${escHtml(home.intro ?? "")}</p><p>Travel designed for you — crafting personalised journeys since 2018 from Vile Parle West, Mumbai.</p><p><a href="/contact">Plan my trip</a> · <a href="/trips">Browse trips</a></p></section>`,
    `<section><h2>Why families choose us</h2>${PILLARS.map((p) => `<h3>${p.q}</h3><p>${escHtml(p.a)}</p>`).join("")}</section>`,
    `<section><h2>Destinations we plan</h2><ul>${dests.map((d) => `<li><a href="/destinations/${d.slug}">${escHtml(d.name)}</a></li>`).join("")}</ul></section>`,
    `<section><h2>How it works</h2><ol>${STEPS.map((s) => `<li><h3>${escHtml(s.q)}</h3><p>${escHtml(s.a)}</p></li>`).join("")}</ol></section>`,
    featured.length ? `<section><h2>Featured trips</h2><ul>${featured.map((t) => `<li><a href="/trips/${t.slug}">${escHtml(t.headline)}</a> — from ${inr(t.price_per_person)} per person</li>`).join("")}</ul></section>` : "",
    `<section><h2>What our travellers say</h2>${TESTIMONIALS.map((r) => `<blockquote><p>${escHtml(r.a)}</p><footer>${escHtml(r.q)}</footer></blockquote>`).join("")}<p><a href="${GOOGLE_PROFILE}">Read our Google reviews</a></p></section>`,
    stories.length ? `<section><h2>Travel stories</h2><ul>${stories.slice(0, 6).map((s) => `<li><a href="/travel-stories/${s.slug}">${escHtml(s.title)}</a></li>`).join("")}</ul></section>` : "",
  ].join(""));

  const aboutBody = wrapBody([
    `<article><h1>${escHtml(about.h1)}</h1>`,
    `<p>Adventourist is a boutique, Mumbai-based travel planning company founded in 2018 by Minal Joshi. From our office in Vile Parle West, Mumbai 400056, we design personalised holidays for families, couples, honeymooners, friend groups and solo travellers across India and around the world — from Ladakh, Kashmir, Kerala and Rajasthan to Bali, Thailand, Sri Lanka, Europe, Georgia and beyond.</p>`,
    `<p>We started Adventourist because most travel packages felt the same: fixed hotels, rushed days and a sales team that disappeared once the booking was paid. We wanted to plan trips the way a well-travelled friend would — honestly, carefully and around the people who are actually travelling.</p>`,
    `<h2>Our founder</h2><h3>Minal Joshi — Founder &amp; Trip Designer</h3><p>Minal founded Adventourist in 2018 and personally designs and reviews itineraries for our travellers. She speaks with clients directly, checks hotels and routes against real on-ground experience, and stays reachable on WhatsApp while guests are travelling. <a href="https://www.linkedin.com/in/minaljoshi1401/">Minal Joshi on LinkedIn</a>.</p>`,
    `<h3>Pinky Prajapati — Operations</h3><p>Pinky leads operations: confirming hotels, transfers, permits and guides, and making sure every booking on the itinerary is in place before departure.</p>`,
    `<h2>How we plan a trip</h2><ol>${STEPS.map((s) => `<li><strong>${escHtml(s.q)}.</strong> ${escHtml(s.a)}</li>`).join("")}</ol><p>Each plan is a day-by-day itinerary with handpicked stays, transfers, sightseeing and local experiences. You can change anything — dates, hotel category, pace, activities or budget — until it feels right, and you only pay for what you choose.</p>`,
    `<h2>Why we charge zero booking fees</h2><p>We never add a booking or service fee on top of your trip. Our margin is built into the rates we negotiate directly with hotels, transport partners and local suppliers, so the price you see is the price you pay. That keeps our advice honest: we recommend what suits your trip, not what earns the highest commission.</p>`,
    `<h2>What we believe</h2>${PILLARS.map((p) => `<h3>${p.q}</h3><p>${escHtml(p.a)}</p>`).join("")}`,
    `<h2>Registration</h2><p>Adventourist is a registered business in Maharashtra, India (GSTIN 27ABMFA3990N1ZQ).</p>`,
    `<h2>Reviews</h2><p>Our travellers rate us on Google. <a href="${GOOGLE_PROFILE}">Read Adventourist reviews on Google</a>.</p>`,
    `<h2>Visit or contact us</h2><p>Adventourist, Vile Parle West, Mumbai, Maharashtra 400056. Phone +91 99304 00694, email support@adventourist.in. Open Monday to Saturday, 9:00 to 21:00 IST. <a href="/contact">Start planning your trip</a>.</p></article>`,
  ].join(""));

  const fq = siteFaqs();
  const faqBody = wrapBody(`<article><h1>${escHtml(faqPage.h1)}</h1>${fq.map((f) => `<h2>${escHtml(f.q)}</h2><p>${escHtml(f.a)}</p>`).join("")}</article>`);

  return [
    { ...home, body: homeBody },
    {
      ...about,
      body: aboutBody,
      schema: [
        { "@context": "https://schema.org", "@type": "Person", name: "Minal Joshi", jobTitle: "Founder & Trip Designer", worksFor: { "@id": `${BASE_URL}/#org` }, sameAs: ["https://www.linkedin.com/in/minaljoshi1401/"] },
        crumbs([{ name: "Home", path: "/" }, { name: "About Us", path: "/about-us" }]),
      ],
    },
    { ...faqPage, body: faqBody, schema: [...(fq.length ? [faqSchema(fq)] : []), crumbs([{ name: "Home", path: "/" }, { name: "FAQs", path: "/faqs" }])] },
  ];
}


/* ── destination guide ───────────────────────────────────────────────── */

const lakh = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)} lakh` : `₹${n.toLocaleString("en-IN")}`);

function monthRanges(grid: { rating: string }[], rating: string): string {
  const out: string[] = [];
  let start = -1;
  for (let i = 0; i <= 12; i++) {
    const hit = i < 12 && grid[i].rating === rating;
    if (hit && start < 0) start = i;
    if (!hit && start >= 0) { out.push(start === i - 1 ? MONTH_NAMES[start] : `${MONTH_NAMES[start]} to ${MONTH_NAMES[i - 1]}`); start = -1; }
  }
  return out.join(", ");
}

function buildDestination(d: any, dTrips: any[], stories: any[]): RouteEntry {
  const url = `${BASE_URL}/destinations/${d.slug}`;
  const img = imageUrl(d.hero_image);
  const g = GUIDES[d.slug];
  const grid = monthGrid(g, d.best_months ?? []);
  const suits = (d.suitable_for ?? []).map((x: string) => x.toLowerCase());
  const themes: string[] = d.themes ?? [];
  const best = monthRanges(grid, "Best");
  const good = monthRanges(grid, "Good");
  const avoid = monthRanges(grid, "Avoid");
  const budget = g ? `${lakh(g.budget[0])}–${lakh(g.budget[1])}` : "";
  const prices = dTrips.map((t) => t.price_per_person).filter(Boolean);
  const from = prices.length ? Math.min(...prices) : 0;
  const kw = g?.kw ?? [d.name.toLowerCase()];
  const related = stories.filter((s) => kw.some((k) => `${s.slug} ${s.title}`.toLowerCase().includes(k.replace(/\s+/g, k.includes(" ") ? " " : "")))).slice(0, 3);

  const summary = [
    `${d.name} suits ${suits.length ? suits.slice(0, 4).join(", ") : "couples, families and friend groups"}${themes.length ? ` looking for ${themes.slice(0, 3).join(", ").toLowerCase()} experiences` : ""}.`,
    `An ideal trip is ${g?.nights ?? "5–7 nights"}${best ? `, best planned for ${best}` : ""}.`,
    budget ? `Budget roughly ${budget} per person from Mumbai, including return flights and mid-range hotels${from ? ` (land packages from ${inr(from)})` : ""}.` : from ? `Land packages start from ${inr(from)} per person.` : "",
  ].filter(Boolean).join(" ");
  const desc = clamp(d.seo_description || `${d.name} trips from Mumbai: ${g?.nights ?? "custom"} itineraries, best time ${best || "year-round"}${budget ? `, about ${budget} per person` : ""}. Visa tips and zero booking fees.`, 160);

  const faqs: QA[] = [
    { q: `What is the best time to visit ${d.name}?`, a: `${best ? `The best months are ${best}: ${g?.notes.B ?? "the most reliable weather"}.` : ""}${good ? ` ${good} ${good.includes(" to ") || good.includes(",") ? "are" : "is"} also good: ${g?.notes.G ?? "shoulder season"}.` : ""}${avoid ? ` Avoid ${avoid} if you can: ${g?.notes.A ?? "off season"}.` : ""}`.trim() },
    { q: `How many days are enough for ${d.name}?`, a: `Most travellers spend ${g?.nights ?? "5–7 nights"} in ${d.name}. That covers the main highlights at a relaxed pace; add 2–3 nights to include offbeat places or slower days.` },
    { q: `How much does a ${d.name} trip cost from Mumbai?`, a: budget ? `Expect roughly ${budget} per person including return flights from Mumbai, mid-range hotels, transfers and sightseeing. Luxury stays, peak dates and private tours cost more.${from ? ` Our land packages start from ${inr(from)} per person.` : ""}` : `Costs depend on dates, hotels and group size. ${from ? `Our packages start from ${inr(from)} per person.` : "Ask us for a free custom quote."}` },
    { q: `Do Indians need a visa or permit for ${d.name}?`, a: g?.visa ?? `Our team will confirm the latest visa and permit rules for your passport before you book.` },
    { q: `How long is the flight from Mumbai to ${d.name}?`, a: g ? `${g.flight}. We plan connections and transfers so you don't lose a day.` : `Flight times vary by route; we will suggest the best connection from Mumbai.` },
  ];

  const table = `<table><thead><tr><th>Month</th><th>Rating</th><th>What to expect</th></tr></thead><tbody>${grid.map((m) => `<tr><td>${m.month}</td><td>${m.rating}</td><td>${escHtml(m.note)}</td></tr>`).join("")}</tbody></table>`;
  const tripList = dTrips.length
    ? `<ul>${dTrips.map((t) => `<li><a href="/trips/${t.slug}">${escHtml(t.headline)}</a>${t.nights && t.days ? ` — ${t.nights} nights / ${t.days} days` : ""}${t.price_per_person ? `, from ${inr(t.price_per_person)} per person` : ""}</li>`).join("")}</ul>`
    : `<p>We don't have a ready-made ${escHtml(d.name)} itinerary listed yet, but we plan custom ${escHtml(d.name)} trips every month.</p>`;

  const body = wrapBody([
    `<article><h1>${escHtml(d.name)} Travel Guide</h1>`,
    `<p>${escHtml(summary)}</p>`,
    d.about ? `<h2>About ${escHtml(d.name)}</h2>${cleanRichHtml(d.about)}` : "",
    `<h2>Best time to visit ${escHtml(d.name)}</h2>`,
    `<p>${escHtml(faqs[0].a)} Prices and crowds peak in the best months, so book 6–10 weeks ahead for those dates.</p>`,
    table,
    `<h2>Visa, permits and flights from Mumbai</h2>`,
    `<p><strong>Visa and permits:</strong> ${escHtml(g?.visa ?? "Our team confirms the latest entry rules for your passport before you book.")}</p>`,
    `<p><strong>Flight time from Mumbai:</strong> ${escHtml(g?.flight ?? "Varies by route.")}. Adventourist books flights, transfers and connections as part of your plan, or works around tickets you already hold.</p>`,
    g ? `<h2>Top experiences in ${escHtml(d.name)}</h2><ul>${g.exp.map((e) => `<li>${escHtml(e)}</li>`).join("")}</ul>` : "",
    themes.length || suits.length ? `<h2>Trip themes and who ${escHtml(d.name)} suits</h2><p>${themes.length ? `Popular themes: ${escHtml(themes.join(", "))}. ` : ""}${suits.length ? `Best for ${escHtml(suits.join(", "))}.` : ""} Every itinerary can be adjusted for pace, hotel category and budget.</p>` : "",
    `<h2>${escHtml(d.name)} trips and itineraries</h2>${tripList}`,
    related.length ? `<h2>${escHtml(d.name)} travel stories</h2><ul>${related.map((s) => `<li><a href="/travel-stories/${s.slug}">${escHtml(s.title)}</a></li>`).join("")}</ul>` : "",
    `<h2>${escHtml(d.name)} FAQs</h2>${faqs.map((f) => `<h3>${escHtml(f.q)}</h3><p>${escHtml(f.a)}</p>`).join("")}`,
    `<p><a href="/trips?destination=${encodeURIComponent(d.name)}">See all ${escHtml(d.name)} trips</a> · <a href="/contact">Plan a custom ${escHtml(d.name)} trip</a></p></article>`,
  ].join(""));

  const llms = [
    `### [${d.name}](${url})`,
    `- Summary: ${summary}`,
    `- Best time: ${best || "year-round"}${avoid ? `; avoid ${avoid}` : ""}`,
    `- Budget: ${budget ? `${budget} per person from Mumbai incl. flights (approx.)` : "on request"}`,
    `- Visa/permits: ${g?.visa ?? "confirmed per passport on request"}`,
    `- Flight from Mumbai: ${g?.flight ?? "varies"}`,
    `- Trips:`,
    ...(dTrips.length ? dTrips.map((t) => `  - [${t.headline}](${BASE_URL}/trips/${t.slug}) — ${t.nights && t.days ? `${t.nights}N/${t.days}D` : "flexible"}, ${t.price_per_person ? `from ${inr(t.price_per_person)} pp` : "price on request"}`) : ["  - Custom itineraries on request"]),
  ].join("\n");

  return {
    body,
    llms,
    path: `/destinations/${d.slug}`,
    lastmod: day(d.updated_at),
    changefreq: "weekly",
    priority: "0.75",
    title: d.seo_title || `${d.name} Travel Guide & Trips from Mumbai`,
    ogTitle: `${d.name} Travel Guide: Best Time, Budget & Trips`,
    ogImageAlt: `${d.name} landscape — Adventourist travel guide cover`,
    description: desc,
    ogImage: img,
    h1: `${d.name} Travel Guide`,
    intro: summary,
    schema: [
      { "@context": "https://schema.org", "@type": "TouristDestination", name: d.name, description: clamp(stripHtml(d.about) || summary, 300), url, image: img, ...(g ? { includesAttraction: g.exp.map((e) => ({ "@type": "TouristAttraction", name: e })) } : {}) },
      faqSchema(faqs),
      crumbs([{ name: "Home", path: "/" }, { name: "Destinations", path: "/destinations" }, { name: d.name, path: `/destinations/${d.slug}` }]),
    ],
  };
}
