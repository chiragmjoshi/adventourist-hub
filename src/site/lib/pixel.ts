/**
 * ChatGPT Ads (oaiq) pixel event helpers.
 * The loader lives in index.html <head> (public site only — blocked inside /admin).
 * All calls are no-ops when the pixel isn't present/blocked, and never throw.
 * The SDK rejects undocumented props — payloads must match the docs exactly.
 */
type OaiqFn = ((...args: unknown[]) => void) & { q?: unknown[] };

function getOaiq(): OaiqFn | null {
  if (typeof window === "undefined") return null;
  if (window.location.pathname.startsWith("/admin")) return null;
  const oaiq = (window as unknown as { oaiq?: OaiqFn }).oaiq;
  return typeof oaiq === "function" ? oaiq : null;
}

/** Public page view — call once per initial load / client-side route change. */
export function trackPageView() {
  const oaiq = getOaiq();
  if (!oaiq) return;
  try {
    oaiq("measure", "page_viewed", { type: "contents" });
  } catch {
    /* never block the UI on pixel errors */
  }
}

const SENT_KEY = "oaiq_leads_sent";

/**
 * Lead conversion — call ONLY after the backend confirms the lead was saved,
 * with the real saved lead id. Deduped per id (event_id also dedupes server-side).
 */
export function trackLeadCreated(savedLeadId: string | null | undefined) {
  if (!savedLeadId) return;
  const oaiq = getOaiq();
  if (!oaiq) return;
  try {
    let sent: string[] = [];
    try {
      sent = JSON.parse(sessionStorage.getItem(SENT_KEY) || "[]");
    } catch { /* storage unavailable */ }
    if (sent.includes(savedLeadId)) return;
    oaiq("measure", "lead_created", { type: "customer_action" }, { event_id: "lead_" + savedLeadId });
    try {
      sessionStorage.setItem(SENT_KEY, JSON.stringify([...sent, savedLeadId].slice(-50)));
    } catch { /* ignore */ }
  } catch {
    /* never block the UI on pixel errors */
  }
}
