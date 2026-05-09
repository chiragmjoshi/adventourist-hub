import { useEffect, useState } from "react";
import SiteLayout from "@/site/SiteLayout";
import TripsGrid from "@/site/sections/TripsGrid";
import { getItineraries, type CMSItinerary } from "@/site/lib/api";

const SITE = "https://adventourist.in";

export default function TripsList() {
  const [trips, setTrips] = useState<CMSItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItineraries().then((d) => {
      if (d) setTrips(d);
      setLoading(false);
    });
  }, []);

  const count = trips.length;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All Trips & Itineraries — Adventourist",
      url: `${SITE}/trips`,
      description: "Browse curated, fully customisable travel itineraries from Mumbai.",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Trips", item: `${SITE}/trips` },
      ],
    },
    count > 0 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: trips.slice(0, 20).map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/trips/${t.slug}`,
        name: t.headline,
      })),
    } : null,
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <SiteLayout
      title="All Trips & Itineraries | Customisable Tours | Adventourist"
      description="Browse curated, fully customisable travel itineraries from Mumbai. Bali, Ladakh, Thailand, Sri Lanka, Vietnam & more. Zero booking fees · 4.8★ rated."
      keywords="travel itineraries, customisable trips, mumbai travel agency, bali ladakh thailand packages"
      jsonLd={jsonLd}
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-drift">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1 text-sm font-body text-ink/55">
          <a href="/" className="hover:text-blaze">Home</a>
          <span className="mx-2 text-ink/25">/</span>
          <span className="text-abyss font-semibold">Trips</span>
        </div>
      </nav>

      {/* Hero — left aligned */}
      <section className="bg-drift pt-6 pb-12 lg:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-blaze font-display font-semibold tracking-[0.2em] text-xs uppercase mb-4">
            Our Itineraries
          </p>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-abyss leading-[1.05] max-w-5xl">
            Explore Ready Itineraries —{" "}
            <span className="text-blaze italic">or let us design yours.</span>
          </h1>
          <p className="font-body text-base lg:text-lg text-ink/65 mt-5 max-w-2xl leading-relaxed">
            Every itinerary here is a starting point. Tell us your dates, group, and budget — we'll tailor it completely around you.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 font-body text-sm text-ink/65">
            <span className="inline-flex items-center gap-1.5"><span className="text-blaze">✓</span> Every trip is customisable</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-blaze">✓</span> Zero booking fees</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-horizon">★</span> 4.8 Google rated</span>
          </div>

          {!loading && count > 0 && (
            <p className="mt-5 inline-flex items-center gap-2 bg-white/60 backdrop-blur border border-abyss/10 rounded-full px-4 py-1.5 font-body text-sm text-abyss">
              <span className="font-display font-bold text-blaze">{count}</span> itineraries ready to personalise
            </p>
          )}
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