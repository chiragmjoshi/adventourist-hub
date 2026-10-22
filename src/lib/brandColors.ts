/**
 * Brand palette as plain hex strings.
 *
 * Why this file exists: Recharts (and other third-party libs that take raw
 * `fill`/`stroke`/`color` string props) can't consume Tailwind class names
 * like `bg-blaze`. Every chart therefore needs the hex value. Before this
 * file the Dashboard inlined `const BLAZE = "#FF6F4C"` etc. — duplicated
 * everywhere a chart renders. If we ever change the palette in
 * tailwind.config.ts we would have to grep for stale hex copies in every
 * page.
 *
 * All six values match tailwind.config.ts exactly (keep in sync — a
 * follow-up PR will add a Vitest test that fails if the two drift).
 *
 * Prefer Tailwind utilities (bg-blaze / text-blaze / border-blaze) for
 * JSX styling. Reach for these constants only when a prop needs a string.
 */

export const BRAND = {
  blaze:   "#FF6F4C" as const,
  horizon: "#FDC436" as const,
  abyss:   "#1A1D2E" as const,
  lagoon:  "#64CBB9" as const,
  ridge:   "#056147" as const,
  drift:   "#EEE5D5" as const,
} as const;

// Convenience aliases so existing call sites that import the uppercase
// names (Dashboard et al.) can migrate without renaming every usage.
export const BLAZE   = BRAND.blaze;
export const HORIZON = BRAND.horizon;
export const ABYSS   = BRAND.abyss;
export const LAGOON  = BRAND.lagoon;
export const RIDGE   = BRAND.ridge;
export const DRIFT   = BRAND.drift;

export type BrandColor = keyof typeof BRAND;
