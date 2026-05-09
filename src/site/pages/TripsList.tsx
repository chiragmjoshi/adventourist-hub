import { useEffect, useState } from "react";
import SiteLayout from "@/site/SiteLayout";
import TripsGrid from "@/site/sections/TripsGrid";
import { getItineraries, type CMSItinerary } from "@/site/lib/api";

export default function TripsList() {
  const [trips, setTrips] = useState<CMSItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItineraries().then((d) => {
      if (d) setTrips(d);
      setLoading(false);
    });
  }, []);

  return (
    <SiteLayout
      title="All Trips & Itineraries | Adventourist"
      description="Browse curated travel itineraries from Mumbai. Filter by destination, duration, budget and travel style. Personalised by experts, planned for you."
    >
      {/* Hero band */}
      <section className="bg-drift topo-texture py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3">Plan Your Next Trip</p>
          <h1 className="font-display font-black text-4xl lg:text-6xl text-abyss leading-tight">
            Find Your <span className="text-blaze italic">Perfect Trip</span>
          </h1>
          <p className="font-body text-lg text-ink/60 mt-4 max-w-2xl mx-auto">
            Every itinerary is a starting point — we'll customise it around your group, dates and pace.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center font-body text-ink/50">
          Loading trips…
        </div>
      ) : (
        <TripsGrid itineraries={trips} />
      )}
    </SiteLayout>
  );
}