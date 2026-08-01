/**
 * Single source of truth for destination → image mappings.
 * Rule: CMS-uploaded image always wins. Otherwise we pick a correct
 * local destination photo. We never fall back to a wrong-country image.
 */
export const DESTINATION_IMAGES: Record<string, string> = {
  // International
  "bali":           "/site-images/bali.webp",
  "thailand":       "/site-images/thailand.webp",
  "vietnam":        "/site-images/vietnam.webp",
  "singapore":      "/site-images/singapore-night.webp",
  "malaysia":       "/site-images/malaysia.webp",
  "seychelles":     "/site-images/seychelles.webp",
  "maldives":       "/site-images/maldives.webp",
  "sri lanka":      "/site-images/sri-lanka.webp",
  "dubai":          "/site-images/dubai.webp",

  // India
  "leh ladakh":     "/site-images/ladakh.webp",
  "ladakh":         "/site-images/ladakh.webp",
  "kashmir":        "/site-images/kashmir.webp",
  "kerala":         "/site-images/kerala.webp",
  "goa":            "/site-images/goa.webp",
  "rajasthan":      "/site-images/rajasthan.webp",

  // Fallback — never a wrong-country image
  "default":        "/site-images/bg-home-page.webp",
};

export function getDestinationImage(
  name?: string | null,
  existingUrl?: string | null,
): string {
  // CMS-set image always wins
  if (existingUrl && existingUrl.trim()) return existingUrl;

  const key = (name || "").toLowerCase().trim();
  if (!key) return DESTINATION_IMAGES["default"];

  // Exact match
  if (DESTINATION_IMAGES[key]) return DESTINATION_IMAGES[key];

  // Partial match — both directions
  for (const [k, url] of Object.entries(DESTINATION_IMAGES)) {
    if (k === "default") continue;
    if (key.includes(k) || k.includes(key)) return url;
  }

  return DESTINATION_IMAGES["default"];
}
