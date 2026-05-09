import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import { getItineraryBySlug, getCMSImageUrl, formatINRPrice, type CMSItinerary } from "@/site/lib/api";
import { waLink } from "@/site/lib/utils";

export default function TripDetail() {
  const { slug = "" } = useParams();
  const [trip, setTrip] = useState<CMSItinerary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    setLoading(true);
    getItineraryBySlug(slug).then((d) => {
      setTrip(d);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout title="Loading… | Adventourist">
        <div className="max-w-4xl mx-auto px-4 py-32 text-center font-body text-ink/50">Loading itinerary…</div>
      </SiteLayout>
    );
  }

  if (!trip) {
    return (
      <SiteLayout title="Trip Not Found | Adventourist">
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="font-display font-black text-3xl text-abyss mb-3">Trip not found</h1>
          <p className="font-body text-ink/60 mb-6">The itinerary you're looking for may have been moved or unpublished.</p>
          <Link to="/trips" className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold px-6 py-3 rounded-full hover:bg-blaze/90 transition-colors">
            Browse All Trips →
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const heroImg = getCMSImageUrl(trip.thumbnail?.file_path ?? trip.pictures?.[0]?.file_path);
  const themes = (trip.destination?.types ?? []).map((t) => t.master_type.value);
  const days = trip.days_data ?? [];

  return (
    <SiteLayout
      title={`${trip.headline} — ${trip.days_and_nights ?? ""} | Adventourist`}
      description={(trip.about ?? "").slice(0, 160) || `Curated ${trip.destination?.name ?? ""} itinerary by Adventourist.`}
    >
      {/* Hero */}
      <section className="relative bg-abyss text-white">
        <div className="absolute inset-0">
          <img src={heroImg} alt={trip.headline} className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/60 to-abyss/20" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
          <Link to="/trips" className="inline-flex items-center gap-1.5 text-white/70 hover:text-horizon font-body text-sm mb-6">
            ← All Trips
          </Link>
          <div className="flex flex-wrap gap-2 mb-4">
            {trip.destination?.name && (
              <span className="bg-horizon text-abyss font-body text-xs font-semibold px-3 py-1 rounded-full">
                {trip.destination.name}
              </span>
            )}
            {themes.slice(0, 3).map((t) => (
              <span key={t} className="bg-white/10 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
          <h1 className="font-display font-black text-4xl lg:text-6xl leading-[1.05] mb-4">{trip.headline}</h1>
          <p className="font-body text-lg text-white/80">{trip.days_and_nights}</p>
          <div className="flex flex-wrap items-end gap-6 mt-8">
            <div>
              <p className="font-body text-xs uppercase tracking-widest text-white/50">From</p>
              <p className="font-display font-black text-3xl">{formatINRPrice(trip.pricing_per_person)}<span className="text-base font-normal text-white/60">/person</span></p>
            </div>
            <a
              href={waLink(trip.headline)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold px-6 py-3 rounded-full hover:bg-blaze/90 transition-colors"
            >
              💬 Plan This Trip
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      {trip.about && (
        <section className="py-12 lg:py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="section-label mb-3">Overview</p>
            <h2 className="font-display font-black text-3xl text-abyss mb-4">About this trip</h2>
            <div className="font-body text-[16px] text-ink/70 leading-[1.75] whitespace-pre-wrap">{trip.about}</div>
          </div>
        </section>
      )}

      {/* Day-by-day */}
      {days.length > 0 && (
        <section className="py-12 lg:py-16 bg-drift">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="section-label mb-3">Itinerary</p>
            <h2 className="font-display font-black text-3xl text-abyss mb-8">Day by day</h2>
            <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
              <div className="md:sticky md:top-24 self-start">
                <ul className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
                  {days.map((d, i) => (
                    <li key={i}>
                      <button
                        onClick={() => setActiveDay(i)}
                        className={`w-full text-left font-body text-sm px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                          activeDay === i ? "bg-blaze text-white font-semibold" : "text-ink/60 hover:bg-white"
                        }`}
                      >
                        Day {i + 1}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm">
                <p className="font-body text-xs uppercase tracking-widest text-blaze font-semibold mb-2">
                  Day {activeDay + 1}
                </p>
                <h3 className="font-display font-black text-2xl text-abyss mb-4">{days[activeDay].title}</h3>
                <div className="font-body text-[15px] text-ink/70 leading-[1.75] whitespace-pre-wrap">{days[activeDay].detail}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Inclusions / Exclusions */}
      {(trip.inclusion || trip.exclusion) && (
        <section className="py-12 lg:py-16 bg-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-8">
            {trip.inclusion && (
              <div>
                <h3 className="font-display font-bold text-xl text-abyss mb-4">✓ What's included</h3>
                <div className="font-body text-[15px] text-ink/70 leading-[1.75] prose-content" dangerouslySetInnerHTML={{ __html: trip.inclusion }} />
              </div>
            )}
            {trip.exclusion && (
              <div>
                <h3 className="font-display font-bold text-xl text-abyss mb-4">✗ Not included</h3>
                <div className="font-body text-[15px] text-ink/70 leading-[1.75] prose-content" dangerouslySetInnerHTML={{ __html: trip.exclusion }} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-blaze text-white text-center px-4">
        <h2 className="font-display font-black text-3xl mb-3">Ready to start planning?</h2>
        <p className="font-body text-white/80 mb-6">Talk to a real expert — replies within 2 hours.</p>
        <a
          href={waLink(trip.headline)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-blaze font-display font-bold px-8 py-4 rounded-full hover:bg-white/90 transition-colors"
        >
          💬 Chat on WhatsApp
        </a>
      </section>
    </SiteLayout>
  );
}