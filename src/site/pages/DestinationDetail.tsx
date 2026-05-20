import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import TripImage from "@/site/ui/TripImage";
import {
  getDestinationBySlug,
  getItinerariesByDestinationId,
  getCMSImageUrl,
  formatINRPrice,
  type CMSDestinationFull,
  type CMSItinerary,
} from "@/site/lib/api";
import { waLink } from "@/site/lib/utils";
import { WHATSAPP_NUMBER_DISPLAY } from "@/site/lib/constants";

const SITE = "https://www.adventourist.in";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DestinationDetail() {
  const { slug = "" } = useParams();
  const [dest, setDest] = useState<CMSDestinationFull | null>(null);
  const [trips, setTrips] = useState<CMSItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDestinationBySlug(slug).then(async (d) => {
      if (!alive) return;
      setDest(d);
      if (d?.id) {
        const ts = await getItinerariesByDestinationId(d.id);
        if (alive) setTrips(ts);
      }
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <SiteLayout>
        <SEO title="Loading…" description="Loading destination…" canonical={`/destinations/${slug}`} noIndex />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center font-body text-ink/50">Loading…</div>
      </SiteLayout>
    );
  }

  if (!dest) {
    return (
      <SiteLayout>
        <SEO title="Destination not found" description="This destination is no longer available." canonical={`/destinations/${slug}`} noIndex />
        <div className="max-w-2xl mx-auto px-4 py-32 text-center">
          <h1 className="font-display font-black text-3xl text-abyss mb-3">Destination not found</h1>
          <Link to="/trips" className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold px-6 py-3 rounded-full">Browse all trips →</Link>
        </div>
      </SiteLayout>
    );
  }

  const heroImg = getCMSImageUrl(dest.hero_image);
  const url = `${SITE}/destinations/${dest.slug}`;
  const title = dest.seo_title || `${dest.name} Travel Guide & Trips from Mumbai`;
  const desc =
    dest.seo_description ||
    `Plan a custom ${dest.name} trip from Mumbai with Adventourist. ${trips.length} curated itineraries, fully personalisable. Zero booking fees · 4.8★ rated.`;

  const bestMonths = (dest.best_months || []).map((m) => MONTHS[m - 1]).filter(Boolean).join(", ");

  const schema: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TouristDestination",
      name: dest.name,
      description: (dest.about || desc).slice(0, 300),
      url,
      image: heroImg,
      touristType: dest.suitable_for,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Destinations", item: `${SITE}/destinations` },
        { "@type": "ListItem", position: 3, name: dest.name, item: url },
      ],
    },
    trips.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${dest.name} Trips`,
          itemListElement: trips.slice(0, 20).map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${SITE}/trips/${t.slug}`,
            name: t.headline,
          })),
        }
      : null,
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <SiteLayout>
      <SEO title={title} description={desc} canonical={`/destinations/${dest.slug}`} ogImage={heroImg} schema={schema} />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-abyss/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-sm font-body text-ink/55">
          <Link to="/" className="hover:text-blaze">Home</Link>
          <span className="mx-2 text-ink/25">/</span>
          <Link to="/destinations" className="hover:text-blaze">Destinations</Link>
          <span className="mx-2 text-ink/25">/</span>
          <span className="text-abyss font-semibold">{dest.name}</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-abyss text-white overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt={`${dest.name} travel`} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/70 to-abyss/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 lg:pt-32 lg:pb-16 min-h-[360px] flex flex-col justify-end">
          <p className="font-display font-semibold tracking-[0.2em] text-xs uppercase mb-3 text-horizon">
            {dest.name} Travel Guide
          </p>
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-6xl leading-[1.05] mb-4 max-w-4xl">
            Custom {dest.name} Trips from Mumbai
          </h1>
          <p className="font-body text-base lg:text-lg text-white/85 max-w-2xl">
            {trips.length > 0
              ? `${trips.length} curated ${dest.name} itineraries — every trip is fully personalised around your dates, group and budget.`
              : `Tell us your dates and budget and we'll design a ${dest.name} trip around you. Zero booking fees.`}
          </p>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-white py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-10">
          <div>
            <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-4">About {dest.name}</h2>
            {dest.about ? (
              <div className="font-body text-[16px] text-ink/75 leading-[1.8] whitespace-pre-wrap mb-6">{dest.about}</div>
            ) : (
              <p className="font-body text-[16px] text-ink/65 mb-6">
                {dest.name} is one of our most-loved destinations for travellers from Mumbai. From culture and food to beaches and adventure, we'll plan a trip that fits your style.
              </p>
            )}

            {(dest.themes.length > 0 || dest.suitable_for.length > 0 || bestMonths) && (
              <dl className="bg-drift/60 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                {bestMonths && (
                  <div>
                    <dt className="font-display font-bold text-xs uppercase tracking-wide text-ink/55 mb-1">Best time to visit</dt>
                    <dd className="font-body text-sm text-abyss">{bestMonths}</dd>
                  </div>
                )}
                {dest.themes.length > 0 && (
                  <div>
                    <dt className="font-display font-bold text-xs uppercase tracking-wide text-ink/55 mb-1">Best for</dt>
                    <dd className="font-body text-sm text-abyss">{dest.themes.join(", ")}</dd>
                  </div>
                )}
                {dest.suitable_for.length > 0 && (
                  <div>
                    <dt className="font-display font-bold text-xs uppercase tracking-wide text-ink/55 mb-1">Suitable for</dt>
                    <dd className="font-body text-sm text-abyss">{dest.suitable_for.join(", ")}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <aside className="bg-abyss text-white rounded-2xl p-6 self-start">
            <h3 className="font-display font-bold text-lg mb-2">Plan your {dest.name} trip</h3>
            <p className="font-body text-sm text-white/70 mb-4">
              Talk to a travel planner. We'll build a custom itinerary at no extra charge.
            </p>
            <a
              href={waLink(`Hi! I'd like to plan a trip to ${dest.name}.`)}
              target="_blank"
              rel="noreferrer"
              className="block text-center bg-blaze hover:bg-blaze/90 text-white font-display font-semibold text-sm px-5 py-3 rounded-full mb-2"
            >
              💬 WhatsApp {WHATSAPP_NUMBER_DISPLAY}
            </a>
            <Link to="/contact" className="block text-center bg-white/10 hover:bg-white/15 text-white font-display font-semibold text-sm px-5 py-3 rounded-full">
              Send an enquiry
            </Link>
          </aside>
        </div>
      </section>

      {/* Trips */}
      <section className="bg-drift/40 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-2">
            {dest.name} Itineraries
          </h2>
          <p className="font-body text-ink/65 mb-8">
            Use these as a starting point — every trip is fully customisable.
          </p>
          {trips.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <p className="font-body text-ink/70 mb-4">
                We don't have a ready-made {dest.name} itinerary listed yet, but we plan custom {dest.name} trips every month.
              </p>
              <a
                href={waLink(`Hi! I'd like a custom ${dest.name} itinerary.`)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blaze text-white font-display font-bold px-6 py-3 rounded-full"
              >
                Plan my {dest.name} trip →
              </a>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trips.map((t) => (
                <Link
                  key={t.id}
                  to={`/trips/${t.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-abyss/10 hover:border-blaze/40 hover:shadow-lg transition-all"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-abyss/5">
                    <TripImage
                      src={getCMSImageUrl(t.thumbnail?.file_path ?? t.pictures?.[0]?.file_path)}
                      alt={t.headline}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display font-bold text-base text-abyss mb-2 line-clamp-2">{t.headline}</h3>
                    <div className="flex items-center justify-between text-sm font-body text-ink/65">
                      <span>{t.days_and_nights}</span>
                      <span className="font-display font-bold text-blaze">
                        {t.pricing_per_person ? `${formatINRPrice(t.pricing_per_person)}/pp` : "On request"}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}