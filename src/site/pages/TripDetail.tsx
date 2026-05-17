import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import TripImage from "@/site/ui/TripImage";
import TripLeadForm from "@/site/components/trip/TripLeadForm";
import { getItineraryBySlug, getItineraries, getCMSImageUrl, formatINRPrice, type CMSItinerary } from "@/site/lib/api";
import { waLink } from "@/site/lib/utils";

const SITE = "https://adventourist.in";

function stripHtml(s?: string) {
  if (!s) return "";
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function htmlToList(s?: string): string[] {
  if (!s) return [];
  const lines = s
    .replace(/<\/(li|p|div|br)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return lines;
}

export default function TripDetail() {
  const { slug = "" } = useParams();
  const [trip, setTrip] = useState<CMSItinerary | null>(null);
  const [related, setRelated] = useState<CMSItinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [stickyVisible, setStickyVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    getItineraryBySlug(slug).then((d) => {
      setTrip(d);
      setLoading(false);
    });
    getItineraries().then((list) => {
      if (list) setRelated(list.filter((t) => t.slug !== slug).slice(0, 3));
    });
  }, [slug]);

  useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroImg = useMemo(
    () => trip ? getCMSImageUrl(trip.thumbnail?.file_path ?? trip.pictures?.[0]?.file_path) : "",
    [trip]
  );

  if (loading) {
    return (
      <SiteLayout title="Loading… | Adventourist">
        <SEO title="Loading… — Adventourist" description="Loading itinerary…" canonical={`/trips/${slug}`} noIndex />
        <div className="max-w-4xl mx-auto px-4 py-32 text-center font-body text-ink/50">Loading itinerary…</div>
      </SiteLayout>
    );
  }
  if (!trip) {
    return (
      <SiteLayout title="Trip Not Found | Adventourist">
        <SEO title="Trip Not Found — Adventourist" description="The itinerary you're looking for may have been moved or unpublished." canonical={`/trips/${slug}`} noIndex />
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

  const themes = (trip.destination?.types ?? []).map((t) => t.master_type.value);
  const suitable = (trip.destination?.suitable_types ?? []).map((s) => s.master_type.value);
  const days = trip.days_data ?? [];
  const inclusions = htmlToList(trip.inclusion);
  const exclusions = htmlToList(trip.exclusion);
  const faqs = trip.faqs ?? [];
  const pictures = trip.pictures ?? [];
  const destinationName = trip.destination?.name;
  const priceText = formatINRPrice(trip.pricing_per_person);
  const tripUrl = `${SITE}/trips/${trip.slug}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      name: trip.headline,
      description: stripHtml(trip.about).slice(0, 300),
      image: heroImg,
      url: tripUrl,
      touristType: suitable,
      itinerary: days.map((d, i) => ({
        "@type": "ItineraryItem",
        position: i + 1,
        name: d.title,
        description: stripHtml(d.detail).slice(0, 300),
      })),
      offers: trip.pricing_per_person ? {
        "@type": "Offer",
        price: trip.pricing_per_person,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: tripUrl,
      } : undefined,
      provider: { "@type": "TravelAgency", name: "Adventourist", url: SITE },
    },
    faqs.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    } : null,
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Trips", item: `${SITE}/trips` },
        { "@type": "ListItem", position: 3, name: trip.headline, item: tripUrl },
      ],
    },
  ].filter(Boolean) as Record<string, unknown>[];

  return (
    <SiteLayout
      title={`${trip.headline} | ${destinationName ?? "Trip"} Itinerary | Adventourist`}
      description={stripHtml(trip.about).slice(0, 160) || `Curated ${destinationName ?? ""} itinerary by Adventourist. ${trip.days_and_nights ?? ""} from ${priceText}/person.`}
      ogImage={heroImg}
      jsonLd={jsonLd}
    >
      <SEO
        title={`${trip.headline} — Adventourist`}
        description={stripHtml(trip.about).slice(0, 155) || `Curated ${destinationName ?? ""} itinerary by Adventourist.`}
        canonical={`/trips/${trip.slug}`}
        ogImage={heroImg}
        ogType="article"
        schema={jsonLd}
      />
      {/* Sticky sub-nav (appears on scroll) */}
      <div
        className={`fixed top-16 lg:top-20 left-0 right-0 z-40 bg-white border-b border-abyss/10 transition-transform duration-300 ${stickyVisible ? "translate-y-0" : "-translate-y-full"}`}
        aria-hidden={!stickyVisible}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          <p className="font-display font-bold text-sm sm:text-base text-abyss truncate">{trip.headline}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="#lead-form"
              className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe58] text-white font-display font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full"
            >
              💬 WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-abyss/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-sm font-body text-ink/55">
          <Link to="/" className="hover:text-blaze">Home</Link>
          <span className="mx-2 text-ink/25">/</span>
          <Link to="/trips" className="hover:text-blaze">Trips</Link>
          {destinationName && <>
            <span className="mx-2 text-ink/25">/</span>
            <span className="text-abyss font-semibold">{destinationName}</span>
          </>}
        </div>
      </nav>

      {/* HERO */}
      <section className="relative bg-abyss text-white overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt={trip.headline} className="w-full h-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/70 to-abyss/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 lg:pt-32 lg:pb-16 min-h-[420px] flex flex-col justify-end">
          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-6xl leading-[1.05] mb-5 max-w-4xl">
            {trip.headline}
          </h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {destinationName && (
              <span className="bg-lagoon text-abyss font-display font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-full">
                {destinationName}
              </span>
            )}
            <span className="bg-horizon text-abyss font-display font-semibold text-xs sm:text-sm px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              ✏️ Fully Customisable
            </span>
            {trip.days_and_nights && (
              <span className="font-body text-sm text-white/85 px-2">{trip.days_and_nights}</span>
            )}
            {trip.pricing_per_person ? (
              <span className="font-body text-sm text-white/85 px-2">
                From <strong className="text-white font-semibold">{priceText}</strong>/person
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* MAIN: 2-column */}
      <section className="bg-white py-10 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 lg:gap-12">

          {/* LEFT */}
          <div className="space-y-12 min-w-0">
            {/* Overview + stats card */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-4">Trip Overview</h2>
              {trip.about && (
                <div className="font-body text-[16px] text-ink/75 leading-[1.8] whitespace-pre-wrap mb-6">
                  {stripHtml(trip.about)}
                </div>
              )}

              {/* Stats card */}
              <dl className="bg-drift/60 rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                <Stat icon="📅" label="Duration" value={trip.days_and_nights || "Flexible"} />
                {destinationName && <Stat icon="📍" label="Destination" value={destinationName} />}
                {trip.pricing_per_person ? <Stat icon="💰" label="Starting From" value={`${priceText}/person`} /> : null}
                {trip.time_to_visit && <Stat icon="🌤️" label="Best Time to Visit" value={trip.time_to_visit} />}
                {themes.length > 0 && <Stat icon="🧭" label="Trip Type" value={themes.slice(0, 2).join(", ")} />}
                {suitable.length > 0 && <Stat icon="👥" label="Suitable For" value={suitable.slice(0, 2).join(", ")} />}
              </dl>
            </div>

            {/* Day-by-day */}
            {days.length > 0 && (
              <div>
                <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">Day-by-Day Itinerary</h2>
                <div className="space-y-3">
                  {days.map((d, i) => {
                    const isOpen = openDay === i;
                    return (
                      <div key={i} className={`border rounded-2xl overflow-hidden transition-colors ${isOpen ? "border-blaze/30 bg-blaze/[0.03]" : "border-abyss/10 bg-white"}`}>
                        <button
                          type="button"
                          onClick={() => setOpenDay(isOpen ? null : i)}
                          aria-expanded={isOpen}
                          className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                        >
                          <span className="flex items-center gap-4 min-w-0">
                            <span className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display font-bold text-sm ${isOpen ? "bg-blaze text-white" : "bg-blaze/10 text-blaze"}`}>
                              {i + 1}
                            </span>
                            <span className="font-display font-bold text-base lg:text-lg text-abyss truncate">{d.title}</span>
                          </span>
                          <svg className={`w-5 h-5 text-blaze flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-5 pl-[68px] font-body text-[15px] text-ink/75 leading-[1.75] whitespace-pre-wrap">
                            {stripHtml(d.detail)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Inclusions / Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div>
                <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">What's Included</h2>
                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                  {inclusions.length > 0 && (
                    <div>
                      <h3 className="font-display font-bold text-base text-ridge mb-3 inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-ridge/15 text-ridge">✓</span>
                        Included
                      </h3>
                      <ul className="space-y-2.5">
                        {inclusions.map((it, i) => (
                          <li key={i} className="flex gap-3 font-body text-[15px] text-ink/75 leading-relaxed">
                            <span className="text-ridge font-bold mt-0.5 flex-shrink-0">✓</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exclusions.length > 0 && (
                    <div>
                      <h3 className="font-display font-bold text-base text-blaze mb-3 inline-flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-blaze/15 text-blaze">✕</span>
                        Not Included
                      </h3>
                      <ul className="space-y-2.5">
                        {exclusions.map((it, i) => (
                          <li key={i} className="flex gap-3 font-body text-[15px] text-ink/75 leading-relaxed">
                            <span className="text-blaze font-bold mt-0.5 flex-shrink-0">✕</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Customisable CTA */}
            <div className="bg-horizon/30 border border-horizon rounded-2xl p-6 lg:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg text-abyss mb-1">This itinerary is fully customisable.</h3>
                <p className="font-body text-sm text-abyss/75">
                  Different dates? Bigger group? Different budget? Just tell us — we'll build it around you at no extra charge.
                </p>
              </div>
              <a
                href="#lead-form"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-blaze text-white font-display font-semibold text-sm px-5 py-3 rounded-full hover:bg-blaze/90 transition-colors"
              >
                💬 Customise This Trip
              </a>
            </div>

            {/* FAQs */}
            {faqs.length > 0 && (
              <div>
                <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">Frequently Asked Questions</h2>
                <dl className="space-y-3">
                  {faqs.map((f, i) => {
                    const isOpen = openFaq === i;
                    return (
                      <div key={i} className="border border-abyss/10 rounded-xl overflow-hidden">
                        <dt>
                          <button
                            type="button"
                            onClick={() => setOpenFaq(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                          >
                            <span className="font-display font-semibold text-abyss">{f.q}</span>
                            <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold transition-colors ${isOpen ? "bg-blaze text-white" : "bg-blaze/10 text-blaze"}`}>
                              {isOpen ? "−" : "+"}
                            </span>
                          </button>
                        </dt>
                        {isOpen && (
                          <dd className="px-5 pb-5 font-body text-[15px] text-ink/75 leading-[1.75]">
                            {f.a}
                          </dd>
                        )}
                      </div>
                    );
                  })}
                </dl>
              </div>
            )}

            {/* Photo gallery */}
            {pictures.length > 0 && (
              <div>
                <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">Photo Gallery</h2>
                <div className="grid grid-cols-3 gap-3 auto-rows-[120px] sm:auto-rows-[160px]">
                  {pictures.slice(0, 5).map((p, i) => (
                    <div key={i} className={`overflow-hidden rounded-xl bg-drift ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                      <img
                        src={getCMSImageUrl(p.file_path)}
                        alt={p.alt_tag || `${trip.headline} photo ${i + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Sticky lead form */}
          <aside id="lead-form" className="lg:sticky lg:top-28 lg:self-start scroll-mt-32">
            <TripLeadForm
              tripTitle={trip.headline}
              tripSlug={trip.slug}
              destination={destinationName}
              pricePerPerson={trip.pricing_per_person}
            />
          </aside>
        </div>
      </section>

      {/* Related trips */}
      {related.length > 0 && (
        <section className="py-12 lg:py-16 bg-drift">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6 gap-4">
              <div>
                <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss">You Might Also Like</h2>
                <p className="font-body text-sm text-ink/55 mt-1">More trips our travellers loved</p>
              </div>
              <Link to="/trips" className="font-display font-semibold text-sm text-blaze hover:underline whitespace-nowrap">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map((t) => (
                <Link
                  key={t.id}
                  to={`/trips/${t.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-abyss/5 transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-[5/3] overflow-hidden">
                    <TripImage
                      path={t.thumbnail?.file_path ?? t.pictures?.[0]?.file_path}
                      alt={`${t.headline} — ${t.destination?.name ?? ""}`}
                      destination={t.destination?.name}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    {t.destination?.name && (
                      <p className="font-display font-semibold text-xs uppercase tracking-wide text-blaze mb-1.5">{t.destination.name}</p>
                    )}
                    <h3 className="font-display font-bold text-base lg:text-lg text-abyss leading-snug mb-2 line-clamp-2">{t.headline}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <p className="font-body text-xs text-ink/55">{t.days_and_nights || "Flexible"}</p>
                      <p className="font-display font-bold text-sm text-abyss">{formatINRPrice(t.pricing_per_person)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Mobile floating CTA */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex gap-2">
        <a
          href="#lead-form"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-blaze text-white font-display font-bold text-sm py-3.5 rounded-full shadow-2xl shadow-blaze/40"
        >
          Plan This Trip
        </a>
        <a
          href={waLink({ trip: trip.headline, slug: trip.slug, source: `trip_mobile_cta_${trip.slug}` })}
          target="_blank" rel="noopener noreferrer"
          aria-label="WhatsApp us"
          className="flex-shrink-0 inline-flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-full shadow-2xl"
        >
          💬
        </a>
      </div>
    </SiteLayout>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span aria-hidden="true" className="text-lg flex-shrink-0 mt-0.5 opacity-80">{icon}</span>
      <div className="min-w-0">
        <dt className="font-display font-medium text-[10.5px] uppercase tracking-[0.14em] text-ink/45">{label}</dt>
        <dd className="font-display font-semibold text-[15px] text-abyss leading-snug mt-1 truncate">{value}</dd>
      </div>
    </div>
  );
}
