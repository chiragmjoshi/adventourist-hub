import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import { getPublicDestinations, getCMSImageUrl, type CMSDestinationFull } from "@/site/lib/api";

const SITE = "https://www.adventourist.in";

export default function DestinationsList() {
  const [dests, setDests] = useState<CMSDestinationFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicDestinations().then((d) => {
      setDests(d);
      setLoading(false);
    });
  }, []);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Travel Destinations from Mumbai — Adventourist",
      url: `${SITE}/destinations`,
      description: "Explore all destinations we plan custom trips for — India and international.",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Destinations", item: `${SITE}/destinations` },
      ],
    },
  ];

  return (
    <SiteLayout>
      <SEO
        title="All Travel Destinations — Custom Trips from Mumbai"
        description="37+ destinations we plan custom trips for from Mumbai — Bali, Ladakh, Thailand, Seychelles, Kashmir, Rajasthan and more. Zero booking fees."
        canonical="/destinations"
        schema={schema}
      />
      <nav aria-label="Breadcrumb" className="bg-drift">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-1 text-sm font-body text-ink/55">
          <Link to="/" className="hover:text-blaze">Home</Link>
          <span className="mx-2 text-ink/25">/</span>
          <span className="text-abyss font-semibold">Destinations</span>
        </div>
      </nav>

      <section className="bg-drift pt-6 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-blaze font-display font-semibold tracking-[0.2em] text-xs uppercase mb-4">
            Where We Plan Trips
          </p>
          <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-abyss leading-[1.05] max-w-5xl">
            All Destinations — <span className="text-blaze italic">India & international.</span>
          </h1>
          <p className="font-body text-base lg:text-lg text-ink/65 mt-5 max-w-2xl">
            Pick a destination to read our guide and see ready itineraries — or just tell us where you want to go and we'll plan it around you.
          </p>
        </div>
      </section>

      <section className="bg-white py-10 lg:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <p className="text-center font-body text-ink/50 py-20">Loading destinations…</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {dests.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/destinations/${d.slug}`}
                    className="group block relative aspect-[4/5] rounded-2xl overflow-hidden bg-abyss/10"
                  >
                    <img
                      src={getCMSImageUrl(d.hero_image)}
                      alt={`${d.name} travel guide`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/40 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <h2 className="font-display font-bold text-white text-lg leading-tight">{d.name}</h2>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}