import { useEffect } from "react";

/**
 * Tracks redirect-only routes that are still deciding where to send the
 * visitor (e.g. async lookups). The page-view tracker skips sending while any
 * are pending; the eventual redirect triggers a new location and its own send.
 */
let pending = 0;

export function isRedirectPending(): boolean {
  return pending > 0;
}

/** Call in redirect-only components that resolve their target asynchronously. */
export function useRedirectPending(active: boolean) {
  useEffect(() => {
    if (!active) return;
    pending += 1;
    return () => {
      pending -= 1;
    };
  }, [active]);
}
