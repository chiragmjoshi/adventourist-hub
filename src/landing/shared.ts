import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/site/lib/constants";

export const PHONE_NUMBER = "+919930400694";
export const PHONE_DISPLAY = "+91 99304 00694";
export const PHONE_TEL = "tel:+919930400694";

export { WHATSAPP_NUMBER, WHATSAPP_URL };

export const waLink = (msg: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export type TemplateId = "bold" | "minimal" | "story";

export interface LandingPageData {
  id: string;
  slug: string;
  name?: string | null;
  hero_headline?: string | null;
  hero_subtext?: string | null;
  hero_image?: string | null;
  budget?: number | null;
  stay_days?: string | null;
  template_id?: TemplateId | string | null;
  channel?: string | null;
  platform?: string | null;
  campaign_type?: string | null;
  ad_group?: string | null;
  custom_inclusions?: string | null;
  custom_exclusions?: string | null;
  gallery?: string[] | null;
  why_adventourist?: string | null;
  suitable_for?: string[] | null;
  destination_type?: string[] | null;
  time_to_visit?: string[] | null;
  seo_title?: string | null;
  seo_description?: string | null;
  form_title?: string | null;
  form_subtitle?: string | null;
  form_submit_text?: string | null;
  form_terms_label?: string | null;
  form_after_submit_message?: string | null;
  destination_id?: string | null;
  itinerary_id?: string | null;
  destinations?: {
    id?: string | null;
    name?: string | null;
    about?: string | null;
    hero_image?: string | null;
    best_months?: number[] | null;
    themes?: string[] | null;
    suitable_for?: string[] | null;
    testimonials?: any[];
  } | null;
}

export interface ItineraryData {
  headline?: string | null;
  about?: string | null;
  itinerary_days?: any[] | null;
  inclusions?: string | null;
  exclusions?: string | null;
  highlights?: any[] | null;
  hero_image?: string | null;
  gallery?: string[] | null;
  price_per_person?: number | null;
  nights?: number | null;
  days?: number | null;
  flights_included?: boolean | null;
  stay_included?: boolean | null;
  transfers_included?: boolean | null;
  meals_included?: boolean | null;
  breakfast_included?: boolean | null;
  sightseeing_included?: boolean | null;
  support_247?: boolean | null;
  best_months?: number[] | null;
  suitable_for?: string[] | null;
  themes?: string[] | null;
  destination_type?: string[] | null;
}

export const FALLBACK_TESTIMONIALS = [
  {
    name: "Rahul & Priya Sharma",
    trip: "Bali Honeymoon",
    text: "Adventourist planned every detail perfectly. The villa, the transfers, the hidden restaurants — all flawless. Best trip of our lives!",
    stars: 5,
  },
  {
    name: "Manish Agarwal",
    trip: "Ladakh Family Trip",
    text: "Planned a Ladakh trip for 8 people including elderly parents. The team handled everything — permits, oxygen, comfortable stays. Truly stress-free.",
    stars: 5,
  },
  {
    name: "Sneha Kulkarni",
    trip: "Vietnam Solo",
    text: "As a solo female traveller I had many concerns. The Adventourist team was available on WhatsApp 24/7. Felt completely safe and supported.",
    stars: 5,
  },
];

/** Parse inclusions/exclusions stored as newline or bullet text into an array. */
export function parseList(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|•|·/)
    .map((s) => s.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);
}