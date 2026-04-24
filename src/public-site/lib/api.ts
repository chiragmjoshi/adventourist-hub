// Typed client for the Adventourist Public API.
// In the admin app this points to the local edge function; in the exported
// frontend kit, set VITE_API_BASE_URL in .env.
const DEFAULT_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  `${(import.meta as any).env?.VITE_SUPABASE_URL}/functions/v1/public-api`;

export type Destination = {
  id: string; slug: string; name: string; about?: string | null;
  hero_image?: string | null; gallery?: string[] | null;
  best_months?: string[] | null; themes?: string[] | null; suitable_for?: string[] | null;
  testimonials?: Array<{ name: string; quote: string; rating?: number; avatar?: string }> | null;
  itineraries?: ItinerarySummary[];
};

export type ItinerarySummary = {
  id: string; slug: string; headline: string; about?: string | null;
  days?: number | null; nights?: number | null; price_per_person?: number | null;
  hero_image?: string | null; themes?: string[] | null; suitable_for?: string[] | null;
  best_months?: string[] | null; destination_id?: string | null;
};

export type ItineraryDay = {
  title?: string; description?: string; accommodation?: string;
  meals?: { breakfast?: boolean; lunch?: boolean; dinner?: boolean };
};

export type Itinerary = ItinerarySummary & {
  itinerary_days?: ItineraryDay[]; inclusions?: string | null; exclusions?: string | null;
  highlights?: string[] | null; gallery?: string[] | null; seo_title?: string | null;
  seo_description?: string | null; destination?: { id: string; slug: string; name: string; hero_image?: string | null; testimonials?: any[] } | null;
};

export type LeadInput = {
  name: string; email: string; mobile: string;
  travel_date?: string | null; pax?: number; message?: string;
  destination_id?: string; itinerary_id?: string; landing_page_id?: string;
  platform?: string; channel?: string; campaign_type?: string; ad_group?: string;
  source?: string; page?: string; website?: string; // honeypot
};

export type ApiError = { code: string; message: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = DEFAULT_BASE.replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || `HTTP ${res.status}`), { code: json?.error?.code });
  return json.data as T;
}

export const api = {
  destinations: (params?: { theme?: string; suitable_for?: string; month?: string }) => {
    const qs = new URLSearchParams(Object.entries(params ?? {}).filter(([, v]) => v) as any).toString();
    return request<Destination[]>(`/v1/destinations${qs ? `?${qs}` : ""}`);
  },
  destination: (slug: string) => request<Destination>(`/v1/destinations/${slug}`),
  itineraries: (params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v != null && v !== "").map(([k, v]) => [k, String(v)])
    ).toString();
    return request<ItinerarySummary[]>(`/v1/itineraries${qs ? `?${qs}` : ""}`);
  },
  itinerary: (slug: string) => request<Itinerary>(`/v1/itineraries/${slug}`),
  landingPage: (slug: string) => request<any>(`/v1/landing-pages/${slug}`),
  testimonials: () => request<any[]>(`/v1/testimonials`),
  masterValues: (type: string) => request<string[]>(`/v1/master-values/${type}`),
  submitLead: (input: LeadInput) =>
    request<{ id: string; traveller_code: string }>(`/v1/leads`, {
      method: "POST", body: JSON.stringify(input),
    }),
};