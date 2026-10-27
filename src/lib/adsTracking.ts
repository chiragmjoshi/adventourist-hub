/**
 * ChatGPT Ads (OpenAI) `lead_created` conversion — enquiry intent.
 * Fired from exactly two places:
 *   1. WhatsApp CTA clicks — delegated listener (installWhatsAppClickTracking, mounted in App.tsx)
 *   2. Saved enquiry forms — src/site/lib/submitLead.ts, after the backend returns the lead id
 * Never fires on /admin. Sends no personal data. Never throws.
 */
import { trackLead } from "@/site/lib/pixel";

declare global {
  interface Window {
    oaiq?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

export type AdsLeadSource = "whatsapp_click" | "enquiry_form";

const onAdmin = () => {
  const p = typeof window === "undefined" ? "" : window.location.pathname;
  return p === "/admin" || p.startsWith("/admin/");
};

export function trackAdsLead(source: AdsLeadSource, eventId?: string): void {
  try {
    if (typeof window === "undefined" || onAdmin()) return;
    if (source === "enquiry_form") {
      // Shared pixel helper: consent check + per-lead-id dedupe (event_id = "lead_<id>").
      if (eventId) trackLead(eventId);
      return;
    }
    if (typeof window.oaiq !== "function") return;
    window.oaiq("measure", "lead_created", { type: "customer_action" }, {
      event_id: eventId ?? "lead_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    });
  } catch {
    /* tracking must never break the page */
  }
}

const WA_HOST = /^(?:[a-z0-9-]+\.)*(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)$/i;

export function isWhatsAppHref(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    return WA_HOST.test(new URL(href, window.location.href).hostname);
  } catch {
    return false;
  }
}

let installed = false;
let lastFired = 0;

/** One capture-phase listener for all current and future WhatsApp CTAs. */
export function installWhatsAppClickTracking(): () => void {
  if (typeof document === "undefined" || installed) return () => {};
  installed = true;
  const handler = (e: MouseEvent) => {
    try {
      if (onAdmin()) return;
      const el = (e.target as Element | null)?.closest?.("a, button");
      if (!el) return;
      const href = el.getAttribute("href") ?? el.getAttribute("data-href") ?? el.getAttribute("formaction");
      if (!isWhatsAppHref(href)) return;
      const now = Date.now();
      if (now - lastFired < 1000) return;
      lastFired = now;
      trackAdsLead("whatsapp_click");
    } catch { /* ignore */ }
  };
  document.addEventListener("click", handler, true);
  return () => {
    document.removeEventListener("click", handler, true);
    installed = false;
  };
}
