import { useEffect } from "react";
import { Route, Navigate, useParams, useLocation } from "react-router-dom";

/**
 * Legacy URL redirects for old WordPress / pre-rebuild paths.
 * These are client-side (SPA) redirects. For SEO-grade 301s, mirror
 * these rules in Cloudflare Bulk Redirects. Cross-host rules
 * (apex→www, blog.* subdomain) MUST live in Cloudflare.
 */

function RedirectParam({ to }: { to: string }) {
  const params = useParams();
  const target = to.replace(/:(\w+)/g, (_, k) => (params as Record<string, string>)[k] ?? "");
  return <Navigate to={target} replace />;
}

function RedirectStatic({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

/** Hard redirect to a path served by the host (e.g. /sitemap.xml in /public). */
function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

// Itinerary slug map (old → current Supabase slug). Keys MUST be lower-cased.
const ITINERARY_MAP: Record<string, string> = {
  "6-nights-and-7-days-leh-ladakh-itinerary-":   "leh-backpacking-trip-with-turtuk-6-nights-7-days",
  "bhutan-itinerary-for-8-days":                 "beautiful-bhutan-trip-6-nights-7-days",
  "spiti-valley-itinerary-6-days":               "spiti-valley-trip-8-nights-9-days",
  "kashmir-trip-itinerary":                      "paradise-on-earth-kashmir-trip-5-nights-6-days",
  "srilanka-maldives-itinerary-7-nights":        "scenic-srilanka-5-nights-6-days",
  "bali-5days-4nights":                          "bali-bliss-trip-5-nights-6-days",
  "vietnam-tour-package":                        "vibrant-vietnam-5-nights-6-days",
  "itinerary-darjeeling-pelling-sikkim-gangtok": "north-east-vacation-in-8-nights-9-days",
};

function normaliseSlug(s: string): string {
  return s.toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function ItineraryRedirect() {
  const { slug = "" } = useParams();
  const mapped = ITINERARY_MAP[normaliseSlug(slug)];
  return <Navigate to={mapped ? `/trips/${mapped}` : "/trips"} replace />;
}

// Root-level legacy slugs (e.g. /bali-bliss-trip-5-nights-6-days) → /trips/:slug
const ROOT_SLUG_MAP: Record<string, string> = {
  "bali-bliss-trip-5-nights-6-days":                    "bali-bliss-trip-5-nights-6-days",
  "leh-backpacking-trip-5-nights-6-days":               "leh-backpacking-trip-5-nights-6-days",
  "leh-backpacking-trip-with-turtuk-6-nights-7-days":   "leh-backpacking-trip-with-turtuk-6-nights-7-days",
  "vibrant-vietnam-5-nights-6-days":                    "vibrant-vietnam-5-nights-6-days",
  "outstanding-oman-in-4-nights-5-days":                "outstanding-oman-in-4-nights-5-days",
  "explore-gujarat-in-10-nights-11-days":               "explore-gujarat-in-10-nights-11-days",
  "magical-meghalaya-trip-6-nights-7-days":             "magical-meghalaya-trip-6-nights-7-days",
  "explore-ladakh-via-manali-in-7-nights-8-days":       "explore-ladakh-via-manali-in-7-nights-8-days",
  "kailash-mansarovar-yatra-by-road-12-nights-13-days": "kailash-mansarovar-yatra-by-road-12-nights-13-days",
  "thai-away-phuket-and-krabi-6-days-5-nights":         "thai-away-phuket-and-krabi-6-days-5-nights",
  "pondicherry-trip-in-3-nights-4-days":                "pondicherry-trip-in-3-nights-4-days",
  "wildlife-of-rajasthan-in-5-nights-6-days":           "wildlife-of-rajasthan-in-5-nights-6-days",
};

function RootSlugRedirect() {
  const { slug = "" } = useParams();
  const mapped = ROOT_SLUG_MAP[normaliseSlug(slug)];
  if (!mapped) return <Navigate to="/404" replace />;
  return <Navigate to={`/trips/${mapped}`} replace />;
}

// Old /story/ slug map
const STORY_MAP: Record<string, string> = {
  "camping-tips": "27-camping-tips",
  "we-bet-you-didn-t-know-about-these-intriguing-facts-about-ladakh": "interesting-facts-about-ladakh",
};

function StoryRedirect() {
  const { slug = "" } = useParams();
  const mapped = STORY_MAP[slug];
  return <Navigate to={mapped ? `/travel-stories/${mapped}` : "/travel-stories"} replace />;
}

// Tag → specific story map (falls back to listing)
const TAG_MAP: Record<string, string> = {
  "camping-tips": "27-camping-tips",
  camping: "27-camping-tips",
};

function TagRedirect() {
  const { tag = "" } = useParams();
  const mapped = TAG_MAP[tag];
  return <Navigate to={mapped ? `/travel-stories/${mapped}` : "/travel-stories"} replace />;
}

// Catches /travel-blog/:slug/1000, /travel-blog/:slug//1000, /travel-blog/:slug/feed, etc.
function BlogPostRedirect() {
  const { slug = "" } = useParams();
  const location = useLocation();
  // Strip trailing /1000, //1000, /feed, /feed/
  let cleanSlug = slug.replace(/\/+$/g, "");
  // If slug itself is empty or junk, fall back to listing
  if (!cleanSlug || cleanSlug === "1000" || cleanSlug === "feed") {
    return <Navigate to="/travel-stories" replace />;
  }
  return <Navigate to={`/travel-stories/${cleanSlug}`} replace state={{ from: location.pathname }} />;
}

/**
 * Returns the legacy <Route> elements. Mount inside the main <Routes>
 * BEFORE any catch-all so these match first.
 */
export function legacyRedirectRoutes() {
  return (
    <>
      {/* Blog homepage + WP pseudo-pages */}
      <Route path="/travel-blog" element={<RedirectStatic to="/travel-stories" />} />
      <Route path="/travel-blog/" element={<RedirectStatic to="/travel-stories" />} />
      <Route path="/travel-blog/home" element={<RedirectStatic to="/travel-stories" />} />
      <Route path="/travel-blog/about" element={<RedirectStatic to="/about-us" />} />
      <Route path="/travel-blog/page/*" element={<RedirectStatic to="/travel-stories" />} />

      {/* Categories */}
      <Route path="/travel-blog/category/*" element={<RedirectStatic to="/travel-stories" />} />

      {/* Tags (with slug mapping where possible) */}
      <Route path="/travel-blog/tag/:tag" element={<TagRedirect />} />
      <Route path="/travel-blog/tag/:tag/*" element={<TagRedirect />} />

      {/* Malformed /1000 suffix variants */}
      <Route path="/travel-blog/:slug/1000" element={<BlogPostRedirect />} />
      <Route path="/travel-blog/:slug//1000" element={<BlogPostRedirect />} />

      {/* WordPress /feed/ */}
      <Route path="/travel-blog/:slug/feed" element={<BlogPostRedirect />} />
      <Route path="/travel-blog/:slug/feed/" element={<BlogPostRedirect />} />

      {/* Standard post slug rename — must come last among /travel-blog/ rules */}
      <Route path="/travel-blog/:slug" element={<RedirectParam to="/travel-stories/:slug" />} />
      <Route path="/travel-blog/:slug/*" element={<RedirectParam to="/travel-stories/:slug" />} />

      {/* Itineraries */}
      <Route path="/itinerary/:slug" element={<ItineraryRedirect />} />
      <Route path="/itineraries/*" element={<RedirectStatic to="/trips" />} />

      {/* Root-level legacy slugs */}
      <Route path="/:slug" element={<RootSlugRedirect />} />

      {/* Old /story/ paths */}
      <Route path="/story/:slug" element={<StoryRedirect />} />

      {/* Typo + sitemap */}
      <Route path="/travelstories" element={<RedirectStatic to="/travel-stories" />} />
      <Route path="/sitemaps" element={<ExternalRedirect to="/sitemap.xml" />} />
    </>
  );
}