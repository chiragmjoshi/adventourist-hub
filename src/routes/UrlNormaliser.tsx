import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Strips legacy WordPress junk from incoming URLs before the router
 * settles, so Google never lands on a duplicate/parameterised variant:
 *
 *   ?replytocom=123, ?share=…, ?like_comment=…  → removed
 *   /some-path/feed, /some-path/feed/            → /some-path
 *   /some-path/amp                               → /some-path
 *   /some-path/1000, /some-path//1000            → /some-path
 *   duplicate slashes                            → collapsed
 *   trailing slash (non-root)                    → removed
 *
 * Uses history.replaceState so no extra history entry is created.
 */

const JUNK_PARAMS = [
  "replytocom",
  "share",
  "like_comment",
  "unapproved",
  "moderation-hash",
  "amp",
];

export function cleanUrl(pathname: string, search: string): string | null {
  let path = pathname;

  // Collapse duplicate slashes
  path = path.replace(/\/{2,}/g, "/");
  // Strip WordPress suffixes (possibly repeated, e.g. /feed/1000)
  let prev: string;
  do {
    prev = path;
    path = path.replace(/\/(feed|amp|1000)\/?$/i, "");
  } while (path !== prev);
  // Trailing slash (keep root)
  if (path.length > 1) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";

  const params = new URLSearchParams(search);
  let paramsChanged = false;
  for (const key of JUNK_PARAMS) {
    if (params.has(key)) {
      params.delete(key);
      paramsChanged = true;
    }
  }

  if (path === pathname && !paramsChanged) return null;

  const qs = params.toString();
  return `${path}${qs ? `?${qs}` : ""}`;
}

export default function UrlNormaliser() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = cleanUrl(pathname, search);
    if (next) window.history.replaceState(window.history.state, "", next + window.location.hash);
  }, [pathname, search]);

  return null;
}
