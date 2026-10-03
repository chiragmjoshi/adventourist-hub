import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/site/lib/pixel";

/** Sends one ChatGPT Ads page_viewed per initial load and per route change. */
export default function PixelPageViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView();
  }, [pathname]);
  return null;
}
