import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { waLink } from "@/site/lib/utils";
import { getCMSImageUrl, type CMSItinerary } from "@/site/lib/api";
import { Badge } from "@/site/ui/Badge";

interface TripCard {
  slug: string; title: string; duration: string;
  budgetFrom: string; tags: string[]; image: string; badge: string | null;
}

function mapAPITrip(t: CMSItinerary): TripCard {
  const imgPath = t.thumbnail?.file_path ?? t.pictures?.[0]?.file_path;
  return {
    slug:       t.slug,
    title:      t.headline,
    duration:   t.days_and_nights ?? "",
    budgetFrom: t.pricing_per_person ? `₹${t.pricing_per_person.toLocaleString("en-IN")}` : "",
    tags:       t.destination?.name ? [t.destination.name] : [],
    image:      getCMSImageUrl(imgPath),
    badge:      null,
  };
}

const FALLBACK_TRIPS: TripCard[] = [
  {
    slug:       "bali-break-5-days-4-nights",
    title:      "Bali Break",
    duration:   "5 Days · 4 Nights",
    budgetFrom: "₹57,000",
    tags:       ["Beach", "Honeymoon", "Culture"],
    image:      "/site-images/bg-home-page.jpg",
    badge:      "Popular",
  },
  {
    slug:       "leh-ladakh-odyssey-7-days",
    title:      "Leh Ladakh Odyssey",
    duration:   "7 Days · 6 Nights",
    budgetFrom: "₹45,000",
    tags:       ["Mountains", "Adventure", "Solo"],
    image:      "/site-images/search-images-8.jpg",
    badge:      "Bestseller",
  },
  {
    slug:       "thailand-highlights-6-days",
    title:      "Thailand Highlights",
    duration:   "6 Days · 5 Nights",
    budgetFrom: "₹65,000",
    tags:       ["Beach", "Culture", "Nightlife"],
    image:      "/site-images/singapore.jpg",
    badge:      null,
  },
  {
    slug:       "seychelles-island-paradise-7-days",
    title:      "Seychelles: Island Paradise",
    duration:   "7 Days · 6 Nights",
    budgetFrom: "₹1,20,000",
    tags:       ["Luxury", "Honeymoon", "Beach"],
    image:      "/site-images/dubai.jpg",
    badge:      "Premium",
  },
  {
    slug:       "vietnam-ascending-dragon-5-nights",
    title:      "The Ascending Dragon — Vietnam",
    duration:   "6 Days · 5 Nights",
    budgetFrom: "₹72,000",
    tags:       ["Culture", "Food", "Adventure"],
    image:      "/site-images/malaysia.jpg",
    badge:      "New",
  },
  {
    slug:       "singapore-malaysia-6-nights",
    title:      "Jewels of the Straits",
    duration:   "7 Days · 6 Nights",
    budgetFrom: "₹89,000",
    tags:       ["City", "Shopping", "Family"],
    image:      "/site-images/bg-home-page.jpg",
    badge:      null,
  },
];

const cardVariants = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: "easeOut" },
  }),
};

function TripCardImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img       src={imgSrc}
      alt={alt}       className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
      onError={() => setImgSrc("/site-images/bg-home-page.jpg")}
    />
  );
}

export default function FeaturedItineraries({ apiTrips }: { apiTrips?: CMSItinerary[] }) {
  const trips: TripCard[] =
    apiTrips && apiTrips.length > 0
      ? apiTrips.slice(0, 6).map(mapAPITrip)
      : FALLBACK_TRIPS;

  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label mb-3">Handpicked For You</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Our Picks <span className="text-blaze italic">For You</span>
            </h2>
            <Link to="/trips"
              className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              View all trips
              <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {trips.map((trip, i) => (
            <motion.div
              key={trip.slug}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-ink/6"
            >
              {/* Hero image — 4:5 ratio */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <TripCardImage src={trip.image} alt={trip.title} />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-abyss/20 to-transparent" />

                {/* Badge */}
                {trip.badge && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="horizon">{trip.badge}</Badge>
                  </div>
                )}

                {/* Overlaid info */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display font-bold text-white text-xl leading-tight mb-1">
                    {trip.title}
                  </h3>
                  <p className="font-body text-white/70 text-sm">{trip.duration}</p>
                </div>
              </div>

              {/* Card body */}
              <div className="p-5">
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {trip.tags.map((tag) => (
                    <Badge key={tag} variant="default">{tag}</Badge>
                  ))}
                </div>

                {/* Price row */}
                <div className="mb-4">
                  <p className="font-body text-xs text-ink/40 uppercase tracking-wide">From</p>
                  <p className="font-display font-bold text-lg text-abyss">{trip.budgetFrom}<span className="text-sm font-normal text-ink/50">/person</span></p>
                </div>

                {/* Always-visible CTA buttons */}
                <div className="flex gap-2">
                  <Link to={`/trips/${trip.slug}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 font-body text-sm font-semibold text-white bg-abyss hover:bg-abyss/90 rounded-lg py-2.5 px-3 transition-colors"
                  >
                    View Trip →
                  </Link>
                  <a
                    href={waLink(trip.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 font-body text-sm font-semibold text-white bg-[#25D366] hover:bg-[#22c55e] rounded-lg py-2.5 px-3 transition-colors"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
