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
  ogType?: "website" | "article";
  schema?: Record<string, unknown>[];
  /** Visible H1 + intro written into the prerendered body. */
  h1: string;
  intro?: string;
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
  if (p.startsWith("/site-images/") || p.startsWith("/assets/")) return `${BASE_URL}${p}`;
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
      "select=slug,headline,about,hero_image,price_per_person,seo_title,seo_description,updated_at&status=eq.published&order=updated_at.desc",
    ),
    fetchTable(
      "travel_stories",
      "select=slug,title,excerpt,thumbnail_url,author,published_at,seo_title,seo_description,updated_at&status=eq.published&order=updated_at.desc",
    ),
    fetchTable(
      "destinations",
      "select=slug,name,about,hero_image,seo_title,seo_description,updated_at&is_active=eq.true&order=name.asc",
    ),
  ]);

  warnDropped("itinerary", trips);
  warnDropped("story", stories);
  warnDropped("destination", dests);

  const tripEntries: RouteEntry[] = trips.filter((t) => isValidSlug(t.slug)).map((t) => {
    const url = `${BASE_URL}/trips/${t.slug}`;
    const about = stripHtml(t.about);
    const img = imageUrl(t.hero_image);
    return {
      path: `/trips/${t.slug}`,
      lastmod: day(t.updated_at),
      changefreq: "weekly" as const,
      priority: "0.8",
      title: `${t.headline} — Adventourist`,
      description:
        t.seo_description || about.slice(0, 155) || `Curated itinerary by Adventourist.`,
      ogImage: img,
      ogType: "article" as const,
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
          provider: { "@type": "TravelAgency", name: "Adventourist", url: BASE_URL },
        },
        crumbs([
          { name: "Home", path: "/" },
          { name: "Trips", path: "/trips" },
          { name: t.headline, path: `/trips/${t.slug}` },
        ]),
      ],
    };
  });

  const destEntries: RouteEntry[] = dests.filter((d) => isValidSlug(d.slug)).map((d) => {
    const url = `${BASE_URL}/destinations/${d.slug}`;
    const img = imageUrl(d.hero_image);
    const desc =
      d.seo_description ||
      `Plan a custom ${d.name} trip from Mumbai with Adventourist. Curated itineraries, fully personalisable. Zero booking fees · 4.8★ rated.`;
    return {
      path: `/destinations/${d.slug}`,
      lastmod: day(d.updated_at),
      changefreq: "weekly" as const,
      priority: "0.75",
      title: d.seo_title || `${d.name} Travel Guide & Trips from Mumbai`,
      description: desc,
      ogImage: img,
      h1: `${d.name} Travel Guide`,
      intro: stripHtml(d.about).slice(0, 320) || desc,
      schema: [
        {
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          name: d.name,
          description: (stripHtml(d.about) || desc).slice(0, 300),
          url,
          image: img,
        },
        crumbs([
          { name: "Home", path: "/" },
          { name: "Destinations", path: "/destinations" },
          { name: d.name, path: `/destinations/${d.slug}` },
        ]),
      ],
    };
  });

  const storyEntries: RouteEntry[] = stories.filter((s) => isValidSlug(s.slug)).map((s) => {
    const url = `${BASE_URL}/travel-stories/${s.slug}`;
    const img = imageUrl(s.thumbnail_url);
    return {
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
          "@type": "BlogPosting",
          headline: s.title,
          description: s.excerpt ?? undefined,
          image: img,
          url,
          datePublished: s.published_at ?? undefined,
          dateModified: s.updated_at ?? undefined,
          author: { "@type": s.author ? "Person" : "Organization", name: s.author || "Adventourist" },
          publisher: { "@type": "Organization", name: "Adventourist", url: BASE_URL },
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

  return [...tripEntries, ...destEntries, ...storyEntries];
}

/** Static + dynamic, de-duplicated by path. */
export async function fetchAllRoutes(): Promise<RouteEntry[]> {
  const dynamic = await fetchDynamicRoutes();
  const seen = new Set<string>();
  return [...staticRoutes, ...dynamic].filter((e) => {
    if (seen.has(e.path)) return false;
    seen.add(e.path);
    return true;
  });
}