import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Injects <meta name="robots" content="noindex, follow"> for URL shapes that
 * must never enter the index, even if something still links to them:
 *   - /itinerary with any query string (legacy ?destination=NN catalogue dupes)
 *   - any path still carrying WordPress / ad tracking junk params
 * Works alongside <UrlNormaliser />, which strips most of these from the URL.
 */
const JUNK_PARAMS = [
  "replytocom",
  "share",
  "like_comment",
  "unapproved",
  "moderation-hash",
  "fbclid",
];

export function shouldNoIndex(pathname: string, search: string): boolean {
  const params = new URLSearchParams(search);
  if (/^\/itinerar(y|ies)\b/i.test(pathname) && params.toString()) return true;
  if (params.get("utm_source") === "rss") return true;
  return JUNK_PARAMS.some((k) => params.has(k));
}

const TAG_ID = "noindex-guard";

export default function NoIndexGuard() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = document.getElementById(TAG_ID);
    if (!shouldNoIndex(pathname, search)) {
      existing?.remove();
      return;
    }
    const meta = (existing as HTMLMetaElement | null) ?? document.createElement("meta");
    meta.id = TAG_ID;
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, follow");
    if (!existing) document.head.appendChild(meta);
  }, [pathname, search]);

  return null;
}
