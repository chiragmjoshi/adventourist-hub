/**
 * Single source of truth for destination → image mappings.
 * Rule: CMS-uploaded image always wins. Otherwise we pick a correct
 * local destination photo. We never fall back to a wrong-country image.
 */
export const DESTINATION_IMAGES: Record<string, string> = {
  // International
  "bali":           "/site-images/bali.jpg",
  "thailand":       "/site-images/thailand.jpg",
  "vietnam":        "/site-images/vietnam.jpg",
  "singapore":      "/site-images/singapore-night.jpg",
  "malaysia":       "/site-images/malaysia.jpg",
  "seychelles":     "/site-images/seychelles.jpg",
  "maldives":       "/site-images/maldives.jpg",
  "sri lanka":      "/site-images/sri-lanka.jpg",
  "dubai":          "/site-images/dubai.jpg",

  // India
  "leh ladakh":     "/site-images/ladakh.jpg",
  "ladakh":         "/site-images/ladakh.jpg",
  "kashmir":        "/site-images/kashmir.jpg",
  "kerala":         "/site-images/kerala.jpg",
  "goa":            "/site-images/goa.jpg",
  "rajasthan":      "/site-images/rajasthan.jpg",

  // Fallback — never a wrong-country image
  "default":        "/site-images/bg-home-page.jpg",
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
