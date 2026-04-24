import { useEffect, useRef } from "react";

/**
 * Calls saveFn() every `intervalMs` ms while `isDirty` is true and `enabled` true.
 * Skips if a save is already in flight.
 */
export function useAutoSaveDraft(
  saveFn: () => Promise<void> | void,
  isDirty: boolean,
  options: { intervalMs?: number; enabled?: boolean } = {},
) {
  const { intervalMs = 60_000, enabled = true } = options;
  const inFlight = useRef(false);
  const dirtyRef = useRef(isDirty);
  const fnRef = useRef(saveFn);

  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => { fnRef.current = saveFn; }, [saveFn]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(async () => {
      if (!dirtyRef.current || inFlight.current) return;
      inFlight.current = true;
      try { await fnRef.current(); } finally { inFlight.current = false; }
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
}