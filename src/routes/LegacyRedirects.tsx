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

// Itinerary slug map (old → new)
const ITINERARY_MAP: Record<string, string> = {
  "Bhutan-Itinerary-for-8-Days": "bhutan-itinerary-8-days",
  "Spiti-Valley-Itinerary-6-Days": "spiti-valley-itinerary-6-days",
  "kashmir-trip-itinerary": "kashmir-trip-itinerary",
  "Srilanka-Maldives-Itinerary-7-Nights": "srilanka-maldives-itinerary-7-nights",
  "bali-5days-4nights": "bali-5-days-4-nights",
  "itinerary-darjeeling-pelling-sikkim-gangtok": "darjeeling-pelling-sikkim-gangtok",
  "vietnam-tour-package": "vietnam-tour-package",
  "6-Nights-and-7-Days-Leh-Ladakh-Itinerary-": "leh-ladakh-6-nights-7-days",
};

function ItineraryRedirect() {
  const { slug = "" } = useParams();
  const mapped = ITINERARY_MAP[slug];
  return <Navigate to={mapped ? `/trips/${mapped}` : "/trips"} replace />;
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
      <Route
        path="/explore-ladakh-via-manali-in-7-nights-8-days"
        element={<RedirectStatic to="/trips/leh-ladakh-6-nights-7-days" />}
      />

      {/* Old /story/ paths */}
      <Route path="/story/:slug" element={<StoryRedirect />} />

      {/* Typo + sitemap */}
      <Route path="/travelstories" element={<RedirectStatic to="/travel-stories" />} />
      <Route path="/sitemaps" element={<RedirectStatic to="/sitemap.xml" />} />
    </>
  );
}