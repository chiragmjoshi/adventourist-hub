import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { FilterState } from "./types";
import { MOCK_ITINERARIES } from "./constants";
import type { Itinerary } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatINR(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 0)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatINRFull(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function captureUTM(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const result: Record<string, string> = {};
  utmKeys.forEach((key) => {
    const val = params.get(key);
    if (val) result[key] = val;
  });
  result.landing_page = window.location.pathname;
  result.referrer = document.referrer || "";
  return result;
}

export function getItineraryBySlug(slug: string): Itinerary | undefined {
  return MOCK_ITINERARIES.find((it) => it.slug === slug);
}

export function filterItineraries(itineraries: Itinerary[], filters: FilterState): Itinerary[] {
  return itineraries.filter((it) => {
    if (filters.destination && it.destination !== filters.destination) return false;
    if (filters.budget) {
      const [min, max] = parseBudgetFilter(filters.budget);
      if (it.budgetFrom < min || it.budgetFrom > max) return false;
    }
    if (filters.duration) {
      const [dMin, dMax] = parseDurationFilter(filters.duration);
      if (it.duration < dMin || it.duration > dMax) return false;
    }
    if (filters.themes.length > 0 && !filters.themes.some((t) => it.travelStyle.includes(t))) return false;
    if (filters.suitableFor.length > 0 && !filters.suitableFor.some((s) => it.suitableFor.includes(s))) return false;
    return true;
  });
}

function parseBudgetFilter(budget: string): [number, number] {
  switch (budget) {
    case "under-30k":  return [0, 30000];
    case "30k-60k":    return [30000, 60000];
    case "60k-1l":     return [60000, 100000];
    case "above-1l":   return [100000, Infinity];
    default:           return [0, Infinity];
  }
}

function parseDurationFilter(duration: string): [number, number] {
  switch (duration) {
    case "3-5":    return [3, 5];
    case "6-8":    return [6, 8];
    case "9-12":   return [9, 12];
    case "13plus": return [13, Infinity];
    default:       return [0, Infinity];
  }
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");
}

export function monthName(monthNum: number): string {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][monthNum - 1] ?? "";
}

const WA_NUMBER = "919930400694";

export interface WALinkOptions {
  /** Trip / itinerary headline shown to the customer. */
  trip?: string;
  /** Trip slug, used in the source token only. */
  slug?: string;
  /** Source tag — gets embedded as [src:xxx] so inbound WA messages are traceable. */
  source?: string;
  /** Override the entire prompt body (still gets the source token appended). */
  message?: string;
}

/**
 * Build a WhatsApp deep link with a trackable source token.
 * Usage:  waLink({ trip: "Bali Break", slug: "bali-break", source: "home_trip_card" })
 * Backwards-compatible: `waLink("Bali Break")` still works.
 */
export function waLink(opts: string | WALinkOptions = {}): string {
  const o: WALinkOptions = typeof opts === "string" ? { trip: opts } : opts;
  const base =
    o.message
      ? o.message
      : o.trip
        ? `Hi! I'm interested in the "${o.trip}" trip. Can you help me plan it?`
        : "Hi! I'm interested in planning a trip with Adventourist.";
  const tokenParts: string[] = [];
  if (o.source) tokenParts.push(`src:${o.source}`);
  if (o.slug)   tokenParts.push(`trip:${o.slug}`);
  const token = tokenParts.length ? ` [${tokenParts.join("|")}]` : "";
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(base + token)}`;
}
