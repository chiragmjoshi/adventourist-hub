/**
 * ChatGPT Ads (oaiq) pixel event helper.
 * The loader lives in index.html <head> (public site only — blocked inside /admin).
 * All calls are no-ops when the pixel isn't present, so this is safe anywhere.
 */
type OaiqFn = ((...args: unknown[]) => void) & { q?: unknown[] };

export function fireOaiqConversion(contentId?: string, contentName?: string) {
  if (typeof window === "undefined") return;
  const oaiq = (window as unknown as { oaiq?: OaiqFn }).oaiq;
  if (typeof oaiq !== "function") return;
  try {
    oaiq(
      "measure",
      "page_viewed",
      {
        type: "contents",
        ...(contentId ? { content_id: contentId } : {}),
        ...(contentName ? { content_name: contentName } : {}),
      },
    );
  } catch {
    /* never block the UI on pixel errors */
  }
}
