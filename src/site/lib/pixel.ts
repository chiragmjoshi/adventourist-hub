/**
 * ChatGPT Ads (oaiq) pixel — the ONE shared helper module.
 * Pixel ID: VFBWyxgwZThcitBoEaSMCk. Base install lives in index.html <head>;
 * ensurePixel() installs the same loader + init (same guard flag) when a
 * visitor first lands on /admin and later navigates to a public page.
 * Every call is try/catch'd, never awaited, never throws. No-op if blocked.
 */
type OaiqFn = ((...args: unknown[]) => void) & { q?: unknown[] };
type W = Window & { oaiq?: OaiqFn; __oaiqInit?: boolean };

export const PIXEL_ID = "VFBWyxgwZThcitBoEaSMCk";
const LOADER = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

let visitorConsent = true; // no consent banner exists yet — default per SDK docs
let appliedConsent: boolean | null = null;

const w = (): W | null => (typeof window === "undefined" ? null : (window as W));
const onAdmin = () => {
  const p = w()?.location.pathname ?? "";
  return p === "/admin" || p.startsWith("/admin/");
};
const effectiveConsent = () => visitorConsent && !onAdmin();

function call(...args: unknown[]) {
  try {
    const f = w()?.oaiq;
    if (typeof f === "function") f(...args);
  } catch { /* never throw */ }
}

/** Installs loader + init once (shared __oaiqInit guard). Never on /admin. */
export function ensurePixel(): boolean {
  const win = w();
  if (!win || onAdmin()) return false;
  try {
    if (!win.__oaiqInit) {
      if (!win.oaiq) {
        const q: OaiqFn = function (...a: unknown[]) { q.q!.push(a); } as OaiqFn;
        q.q = [];
        win.oaiq = q;
        const s = document.createElement("script");
        s.async = true;
        s.src = LOADER;
        document.head.appendChild(s);
      }
      const debug = new URLSearchParams(win.location.search).get("oaiq_debug") === "1";
      if (!visitorConsent) call("consent", false);
      call("init", debug ? { pixelId: PIXEL_ID, debug: true } : { pixelId: PIXEL_ID });
      win.__oaiqInit = true;
    }
    return typeof win.oaiq === "function";
  } catch {
    return false;
  }
}

/** Apply effective consent (visitor consent AND not on /admin). Call on every route change. */
export function syncConsent() {
  const eff = effectiveConsent();
  if (eff) ensurePixel();
  if (appliedConsent === eff) return;
  if (!w()?.oaiq) return;
  call("consent", eff);
  appliedConsent = eff;
}

export function setPixelConsent(granted: boolean) {
  visitorConsent = granted;
  syncConsent();
}

export function trackPageView() {
  if (!effectiveConsent() || !ensurePixel()) return;
  call("measure", "page_viewed", { type: "contents" });
}

const SENT_KEY = "oaiq_leads_sent";
const fired = new Set<string>();
try {
  (JSON.parse(sessionStorage.getItem(SENT_KEY) || "[]") as string[]).forEach((id) => fired.add(id));
} catch { /* storage unavailable */ }

/** Lead conversion — ONLY after backend confirms save, with the real saved lead id. */
export function trackLead(savedLeadId: string | null | undefined) {
  if (!savedLeadId || fired.has(savedLeadId)) return;
  if (!effectiveConsent() || !ensurePixel()) return;
  try {
    call("measure", "lead_created", { type: "customer_action" }, { event_id: "lead_" + savedLeadId });
    fired.add(savedLeadId);
    try {
      sessionStorage.setItem(SENT_KEY, JSON.stringify([...fired].slice(-50)));
    } catch { /* ignore */ }
  } catch { /* never throw */ }
}
