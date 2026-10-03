import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { syncConsent, trackPageView } from "@/site/lib/pixel";

// Module-level dedupe: survives StrictMode double effects and re-renders.
let lastKey: string | null = null;
let lastPath: string | null = null;

/** Mounted once inside the Router. One page_viewed per genuine public pathname change. */
export default function PixelRouteTracker() {
  const location = useLocation();
  useEffect(() => {
    syncConsent();
    if (location.key === lastKey) return;
    lastKey = location.key;
    const path = location.pathname;
    if (path === lastPath) return; // query-string-only change
    lastPath = path;
    if (path === "/admin" || path.startsWith("/admin/")) return;
    trackPageView();
  }, [location.key, location.pathname]);
  return null;
}
