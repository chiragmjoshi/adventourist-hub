import { useEffect, useRef, useState, useCallback } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Tracks form dirtiness vs an initial snapshot, and intercepts:
 * - In-app navigation (React Router useBlocker → AlertDialog UI handled by caller)
 * - Browser navigation (beforeunload native dialog)
 *
 * The hook returns the blocker object so the caller can render its own
 * AlertDialog via blocker.state === "blocked".
 */
export function useUnsavedChanges<T>(currentValue: T, enabled = true) {
  const initialRef = useRef<string>(JSON.stringify(currentValue));
  const [isDirty, setIsDirty] = useState(false);

  // Recompute dirtiness whenever the watched value changes.
  useEffect(() => {
    if (!enabled) {
      setIsDirty(false);
      return;
    }
    setIsDirty(JSON.stringify(currentValue) !== initialRef.current);
  }, [currentValue, enabled]);

  // Intercept browser navigation/refresh/close.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-app navigation. Caller renders the dialog UI.
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const markClean = useCallback((nextSnapshot?: T) => {
    initialRef.current = JSON.stringify(nextSnapshot ?? currentValue);
    setIsDirty(false);
  }, [currentValue]);

  const resetSnapshot = useCallback((snapshot: T) => {
    initialRef.current = JSON.stringify(snapshot);
    setIsDirty(false);
  }, []);

  return { isDirty, blocker, markClean, resetSnapshot };
}