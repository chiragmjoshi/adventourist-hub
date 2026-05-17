import { supabase } from "@/integrations/supabase/client";
import type { CMSItinerary, CMSDestination, CMSMasterData } from "./cms-types";
export type { CMSItinerary, CMSDestination, CMSMasterData } from "./cms-types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
const DEFAULT_BUCKET = "itinerary-images";

export type CMSImageOptions = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
};

/** Append Supabase Storage render transform params to a public URL. */
function withTransform(url: string, options?: CMSImageOptions): string {
  if (!options) return url;
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.resize) params.set("resize", options.resize);
  if (options.quality) params.set("quality", String(options.quality));
  const qs = params.toString();
  if (!qs) return url;
  // Supabase image transform endpoint lives under /storage/v1/render/image/public/...
  // We replace /object/public with /render/image/public to enable transforms.
  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  return `${transformed}${transformed.includes("?") ? "&" : "?"}${qs}`;
}

/** Resolve a stored image path to a public URL. Accepts full URLs, bucket-prefixed paths, or bare keys.
 *  Optional second arg may be a bucket name (legacy) or an options object for image transforms. */
export function getCMSImageUrl(
  p?: string | null,
  bucketOrOptions: string | CMSImageOptions = DEFAULT_BUCKET,
  maybeOptions?: CMSImageOptions
): string {
  if (!p) return "/site-images/bali.jpg";
  // Local public assets (already SEO-optimised images shipped with the site) — return as-is.
  if (p.startsWith("/site-images/") || p.startsWith("/assets/")) return p;
  const bucket = typeof bucketOrOptions === "string" ? bucketOrOptions : DEFAULT_BUCKET;
  const options =
    typeof bucketOrOptions === "object" ? bucketOrOptions : maybeOptions;

  let url: string;
  if (p.startsWith("http")) {
    url = p;
  } else {
    const clean = p.startsWith("/") ? p.slice(1) : p;
    url = clean.includes("/") ? `${STORAGE_BASE}/${clean}` : `${STORAGE_BASE}/${bucket}/${clean}`;
  }
  if (options && url.includes("/storage/v1/object/public/")) {
    return withTransform(url, options);
  }
  return url;
}

export const formatINRPrice = (n?: number | null): string => {
  if (!n || isNaN(n)) return "On Request";
  return "₹" + n.toLocaleString("en-IN");
};

// ── Mappers: Supabase row → legacy CMSItinerary shape ─────────────────────────
function mapItinerary(row: any): CMSItinerary {
  const dest = row.destinations ?? null;
  const heroImg = row.hero_image ?? row.gallery?.[0] ?? null;
  const gallery: string[] = Array.isArray(row.gallery) ? row.gallery : [];
  const days = row.days ?? null;
  const nights = row.nights ?? null;
  const itineraryDays: Array<{ title?: string; detail?: string; day?: number }> =
    Array.isArray(row.itinerary_days) ? row.itinerary_days : [];

  return {
    id: row.id,
    slug: row.slug,
    headline: row.headline,
    about: row.about ?? undefined,
    days_and_nights:
      days || nights ? `${days ?? ""} Days ${nights ?? ""} Nights`.trim() : undefined,
    pricing_per_person: row.price_per_person ?? undefined,
    thumbnail: heroImg ? { file_path: heroImg } : undefined,
    pictures: gallery.map((file_path) => ({ file_path })),
    days_data: itineraryDays.map((d) => ({
      title: d.title ?? "",
      detail: d.detail ?? (d as any).description ?? "",
    })),
    inclusion: row.inclusions ?? undefined,
    exclusion: row.exclusions ?? undefined,
    important_things: undefined,
    destination: dest
      ? {
          id: dest.id,
          name: dest.name,
          pictures: dest.hero_image ? [{ file_path: dest.hero_image }] : [],
          types: (dest.themes ?? []).map((value: string, i: number) => ({
            master_type: { id: i, value },
          })),
          suitable_types: (dest.suitable_for ?? []).map((value: string, i: number) => ({
            master_type: { id: i, value },
          })),
          time_to_visits: (dest.best_months ?? []).map((time: string, id: number) => ({
            id,
            time,
          })),
        }
      : undefined,
    status: row.status ?? undefined,
    time_to_visit: Array.isArray(row.best_months) && row.best_months.length
      ? row.best_months.join(", ")
      : undefined,
  } as CMSItinerary;
}

function mapDestination(row: any): CMSDestination {
  return {
    id: row.id,
    name: row.name,
    pictures: row.hero_image ? [{ file_path: row.hero_image }] : [],
  } as CMSDestination;
}

// ── Public API ────────────────────────────────────────────────────────────────
const ITINERARY_SELECT = `
  id, slug, headline, about, days, nights, price_per_person,
  hero_image, gallery, highlights, themes, suitable_for, best_months,
  inclusions, exclusions, itinerary_days, status, published_at,
  destinations:destination_id(id, name, slug, hero_image, themes, suitable_for, best_months)
`;

export async function getItineraries(
  params: { destination?: string; theme?: string; suitableFor?: string } = {},
): Promise<CMSItinerary[] | null> {
  let query = supabase
    .from("itineraries")
    .select(ITINERARY_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (params.destination) {
    const { data: dest } = await supabase
      .from("destinations")
      .select("id")
      .ilike("name", params.destination)
      .maybeSingle();
    if (dest?.id) query = query.eq("destination_id", dest.id);
  }
  if (params.theme) query = query.contains("themes", [params.theme]);
  if (params.suitableFor) query = query.contains("suitable_for", [params.suitableFor]);

  const { data, error } = await query;
  if (error) {
    console.error("getItineraries error:", error);
    return [];
  }
  return (data ?? []).map(mapItinerary);
}

export async function getItineraryBySlug(slug: string): Promise<CMSItinerary | null> {
  const { data, error } = await supabase
    .from("itineraries")
    .select(ITINERARY_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return mapItinerary(data);
}

export async function getMasterData(): Promise<CMSMasterData | null> {
  const [destResult, themeResult, suitableResult, monthResult] = await Promise.all([
    supabase
      .from("destinations")
      .select("id, name, slug, hero_image")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("master_values")
      .select("value")
      .eq("type", "theme")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("master_values")
      .select("value")
      .eq("type", "suitable_for")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("master_values")
      .select("value")
      .eq("type", "best_month")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  return {
    destinations: (destResult.data ?? []).map(mapDestination),
    destination_type: (themeResult.data ?? []).map((r: any, id: number) => ({
      id,
      value: r.value,
    })),
    destination_suitable_type: (suitableResult.data ?? []).map((r: any, id: number) => ({
      id,
      value: r.value,
    })),
    time_to_visit: (monthResult.data ?? []).map((r: any) => r.value),
  };
}

// ── Stories ───────────────────────────────────────────────────────────────────
export interface CMSStory {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image_url?: string;
  author: string;
  category: string;
  tags: string[];
  read_time_minutes: number;
  published_at?: string;
  views: number;
  destination?: { id: string; name: string; slug: string };
}

export async function getStories(category?: string): Promise<CMSStory[]> {
  let query = supabase
    .from("stories")
    .select(
      "id, slug, title, excerpt, cover_image_url, author, category, tags, read_time_minutes, published_at, views, destinations:destination_id(id, name, slug)",
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(20);
  if (category && category !== "All") query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("getStories error:", error);
    return [];
  }
  return (data ?? []).map((s: any) => ({ ...s, destination: s.destinations ?? undefined }));
}

export async function getStoryBySlug(
  slug: string,
): Promise<
  | (CMSStory & { content?: string; seo_title?: string; seo_description?: string; og_image_url?: string })
  | null
> {
  const { data, error } = await supabase
    .from("stories")
    .select("*, destinations:destination_id(id, name, slug)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error || !data) return null;
  // Fire-and-forget view increment
  supabase.rpc("increment_story_views", { story_slug: slug }).then(() => {});
  return { ...(data as any), destination: (data as any).destinations ?? undefined };
}

// ── Travel Stories (new table) ───────────────────────────────────────────────
export type TravelStoryCategory = "travel-stories" | "things-to-do" | "destination-guides";

export interface TravelStory {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  category: TravelStoryCategory;
  tags: string[] | null;
  author: string | null;
  thumbnail_url: string | null;
  read_time_minutes: number | null;
  views: number | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  published_at: string | null;
}

// Deterministic, destination-aware imagery so every story gets a relevant,
// fast-loading Unsplash thumbnail when no thumbnail_url is set in the DB.
const _u = (id: string, w = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const TRAVEL_STORY_DEST_IMAGES: { keys: string[]; image: string }[] = [
  { keys: ["ladakh", "leh", "pangong", "shanti stupa", "magnetic hill", "hemis", "chadar", "nubra"], image: _u("photo-1571536802807-30451e3955d8") },
  { keys: ["kashmir", "gulmarg", "sonmarg", "pahalgam", "srinagar"], image: _u("photo-1571536802807-30451e3955d8") },
  { keys: ["rajasthan", "jaipur", "jodhpur", "jaisalmer", "udaipur", "chittorgarh", "pushkar"], image: _u("photo-1599661046289-e31897846e41") },
  { keys: ["bhutan", "paro", "thimphu", "punakha"], image: _u("photo-1626621341517-bbf3d9990a23") },
  { keys: ["himachal", "spiti", "kasol", "manali", "shimla", "dharamshala", "uttarakhand", "rishikesh"], image: _u("photo-1626621341517-bbf3d9990a23") },
  { keys: ["sri lanka", "srilanka", "ceylon", "colombo", "kandy"], image: _u("photo-1578005343432-bf1ab1b5e6f4") },
  { keys: ["maldives"], image: _u("photo-1537996194471-e657df975ab4") },
  { keys: ["andaman", "havelock", "neil island"], image: _u("photo-1537996194471-e657df975ab4") },
  { keys: ["bali", "indonesia"], image: _u("photo-1537996194471-e657df975ab4") },
  { keys: ["thailand", "phuket", "krabi", "bangkok", "pattaya"], image: _u("photo-1528181304800-259b08848526") },
  { keys: ["vietnam", "hanoi", "ho chi minh", "halong"], image: _u("photo-1528360983277-13d401cdc186") },
  { keys: ["dubai", "uae", "abu dhabi"], image: _u("photo-1525625293386-3f8f99389edd") },
  { keys: ["singapore"], image: _u("photo-1525625293386-3f8f99389edd") },
  { keys: ["kerala", "munnar", "alleppey", "kochi", "wayanad"], image: _u("photo-1602216056096-3b40cc0c9944") },
  { keys: ["assam", "meghalaya", "kaziranga", "shillong", "north bengal", "darjeeling", "sikkim", "northeast"], image: _u("photo-1602216056096-3b40cc0c9944") },
  { keys: ["tallinn", "estonia", "croatia", "pula", "europe", "italy", "spain", "greece"], image: _u("photo-1499856871958-5b9627545d1a") },
  { keys: ["africa", "kenya", "tanzania", "south africa", "safari"], image: _u("photo-1516026672322-bc52d61a55d5") },
];

const TRAVEL_STORY_CATEGORY_POOL: Record<string, string[]> = {
  "travel-stories": [
    _u("photo-1571536802807-30451e3955d8"),
    _u("photo-1599661046289-e31897846e41"),
    _u("photo-1626621341517-bbf3d9990a23"),
    _u("photo-1602216056096-3b40cc0c9944"),
  ],
  "things-to-do": [
    _u("photo-1537996194471-e657df975ab4"),
    _u("photo-1528181304800-259b08848526"),
    _u("photo-1578005343432-bf1ab1b5e6f4"),
    _u("photo-1525625293386-3f8f99389edd"),
  ],
  "destination-guides": [
    _u("photo-1499856871958-5b9627545d1a"),
    _u("photo-1571536802807-30451e3955d8"),
    _u("photo-1602216056096-3b40cc0c9944"),
    _u("photo-1516026672322-bc52d61a55d5"),
  ],
};

function _hashSlug(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function travelStoryImage(s: {
  thumbnail_url?: string | null;
  category: string;
  focus_keyword?: string | null;
  title?: string | null;
  slug?: string | null;
}): string {
  if (s.thumbnail_url) return s.thumbnail_url;
  const hay = `${s.focus_keyword ?? ""} ${s.title ?? ""}`.toLowerCase();
  if (hay.trim()) {
    for (const entry of TRAVEL_STORY_DEST_IMAGES) {
      if (entry.keys.some((k) => hay.includes(k))) return entry.image;
    }
  }
  const pool =
    TRAVEL_STORY_CATEGORY_POOL[s.category] ??
    TRAVEL_STORY_CATEGORY_POOL["travel-stories"];
  return pool[_hashSlug(s.slug ?? s.title ?? "x") % pool.length];
}

const TRAVEL_STORY_LIST_COLS =
  "id,title,slug,excerpt,category,thumbnail_url,read_time_minutes,views,published_at,author,tags,status,seo_title,seo_description,focus_keyword";

export async function getTopTravelStories(limit = 4): Promise<TravelStory[]> {
  const { data, error } = await supabase
    .from("travel_stories" as any)
    .select(TRAVEL_STORY_LIST_COLS)
    .eq("status", "published")
    .order("views", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getTopTravelStories error:", error);
    return [];
  }
  return (data ?? []) as unknown as TravelStory[];
}

export async function getAllTravelStories(): Promise<TravelStory[]> {
  const { data, error } = await supabase
    .from("travel_stories" as any)
    .select(TRAVEL_STORY_LIST_COLS)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("getAllTravelStories error:", error);
    return [];
  }
  return (data ?? []) as unknown as TravelStory[];
}

export async function getTravelStoryBySlug(slug: string): Promise<(TravelStory & { content_html: string | null }) | null> {
  const { data, error } = await supabase
    .from("travel_stories" as any)
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as TravelStory;
}

export async function getRelatedTravelStories(
  category: string,
  excludeSlug: string,
  limit = 3,
): Promise<TravelStory[]> {
  const { data, error } = await supabase
    .from("travel_stories" as any)
    .select(TRAVEL_STORY_LIST_COLS)
    .eq("status", "published")
    .eq("category", category)
    .neq("slug", excludeSlug)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getRelatedTravelStories error:", error);
    return [];
  }
  return (data ?? []) as unknown as TravelStory[];
}
