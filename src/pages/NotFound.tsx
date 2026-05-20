import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const { pathname } = useLocation();
  const isTrip = pathname.startsWith("/trips/") || pathname.startsWith("/itinerary/");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-drift/40 px-4">
      <Helmet>
        <title>404 — Page Not Found | Adventourist</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="prerender-status-code" content="404" />
        <meta httpEquiv="Status" content="404 Not Found" />
      </Helmet>
      <div className="text-center max-w-lg">
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-abyss mb-3">
          {isTrip ? "404 — This itinerary has moved" : "404 — Page not found"}
        </h1>
        <p className="font-body text-ink/70 mb-8">
          {isTrip
            ? "This trip link may be outdated. Browse all our current itineraries below."
            : "The page you're looking for doesn't exist."}
        </p>
        <Link
          to="/trips"
          className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold px-6 py-3 rounded-full hover:bg-blaze/90 transition-colors"
        >
          Browse All Trips →
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
