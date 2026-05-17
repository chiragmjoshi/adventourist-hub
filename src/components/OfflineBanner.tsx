import { useEffect, useState } from "react";

/**
 * Global offline / reconnected banner.
 * Mounts once at the app root and listens for browser online/offline events.
 */
export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const t = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(t);
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed top-0 inset-x-0 z-[9999] bg-destructive text-destructive-foreground text-center text-sm font-medium py-2 px-4 shadow-md"
      >
        ⚠ No internet connection — changes may not be saved
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[9999] bg-emerald-600 text-white text-center text-sm font-medium py-2 px-4 shadow-md"
    >
      ✓ Back online
    </div>
  );
}

export default OfflineBanner;
