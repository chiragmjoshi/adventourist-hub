import type { CMSItinerary, CMSMasterData } from "./cms-types";

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cms-proxy`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const IMG_BASE = "https://cms2.adventourist.in/storage/";

export function getCMSImageUrl(p?: string | null): string {
  if (!p) return "/site-images/bg-home-page.jpg";
  if (p.startsWith("http")) return p;
  const clean = p.startsWith("/") ? p.slice(1) : p;
  return `${IMG_BASE}${clean}`;
}

async function cmsGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${PROXY_URL}?path=${encodeURIComponent(path)}`, {
      headers: ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY } : {},
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}

export const getItineraries = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return cmsGet<CMSItinerary[]>(`/itineraries${qs ? `?${qs}` : ""}`);
};

export const getItineraryBySlug = (slug: string) =>
  cmsGet<CMSItinerary>(`/itineraries/${slug}`);

export const getMasterData = () => cmsGet<CMSMasterData>("/master-data");

export const formatINRPrice = (n?: number | null): string => {
  if (!n || isNaN(n)) return "On Request";
  return "₹" + n.toLocaleString("en-IN");
};