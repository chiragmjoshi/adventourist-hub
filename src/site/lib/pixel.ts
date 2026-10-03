/**
 * ChatGPT Ads (oaiq) pixel event helper.
 * The loader lives in index.html <head> (public site only — blocked inside /admin).
 * All calls are no-ops when the pixel isn't present, so this is safe anywhere.
 * NOTE: the SDK rejects undocumented props (e.g. content_id) — the payload must
 * be exactly `{ type: "contents" }` per ChatGPT Ads pixel docs.
 */
type OaiqFn = ((...args: unknown[]) => void) & { q?: unknown[] };

export function fireOaiqConversion() {
  if (typeof window === "undefined") return;
  const oaiq = (window as unknown as { oaiq?: OaiqFn }).oaiq;
  if (typeof oaiq !== "function") return;
  try {
    oaiq("measure", "page_viewed", { type: "contents" });
  } catch {
    /* never block the UI on pixel errors */
  }
}
