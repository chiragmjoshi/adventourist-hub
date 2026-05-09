import { supabase } from "@/integrations/supabase/client";
import type { CMSItinerary, CMSDestination, CMSMasterData } from "./cms-types";
export type { CMSItinerary, CMSDestination, CMSMasterData } from "./cms-types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public`;
const DEFAULT_BUCKET = "itinerary-images";

/** Resolve a stored image path to a public URL. Accepts full URLs, bucket-prefixed paths, or bare keys. */
export function getCMSImageUrl(p?: string | null, bucket: string = DEFAULT_BUCKET): string {
  if (!p) return "/site-images/bg-home-page.jpg";
  if (p.startsWith("http")) return p;
  const clean = p.startsWith("/") ? p.slice(1) : p;
  // If the path already includes a bucket segment (e.g. "stories/foo.jpg"), use as-is
  if (clean.includes("/")) return `${STORAGE_BASE}/${clean}`;
  return `${STORAGE_BASE}/${bucket}/${clean}`;
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
