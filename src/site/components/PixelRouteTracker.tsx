import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { syncConsent, trackPageView } from "@/site/lib/pixel";
import { isRedirectPending } from "@/site/lib/routeSettle";

// Module-level dedupe: survives StrictMode double effects and re-renders.
let lastKey: string | null = null;
let lastSentPath: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

// Redirect routes (<Navigate replace>, URL normaliser) change location within
// the same tick; waiting briefly lets the location settle so only the final
// destination is counted.
const SETTLE_MS = 150;

/** Mounted once inside the Router. One page_viewed per genuine public pathname change. */
export default function PixelRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    syncConsent();
    if (location.key === lastKey) return;
    lastKey = location.key;
    const key = location.key;
    const path = location.pathname;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        if (key !== lastKey) return; // superseded by a redirect
        if (isRedirectPending()) return; // async redirect will navigate again
        if (path === lastSentPath) return; // query-string-only change
        lastSentPath = path;
        if (path === "/admin" || path.startsWith("/admin/")) return;
        trackPageView();
      } catch {
        /* never throw */
      }
    }, SETTLE_MS);
  }, [location.key, location.pathname]);
  return null;
}
