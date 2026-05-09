import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { waLink } from "@/site/lib/utils";
import { getCMSImageUrl, type CMSItinerary, type CMSDestination } from "@/site/lib/api";

interface TripCard {
  slug: string;
  title: string;
  duration: string;
  budgetFrom: string;
  destination: string;
  image: string;
  rawPrice?: string;
}

function mapAPITrip(t: CMSItinerary): TripCard {
  const imgPath = t.thumbnail?.file_path ?? t.pictures?.[0]?.file_path;
  return {
    slug:        t.slug,
    title:       t.headline,
    duration:    t.days_and_nights ?? "",
    budgetFrom:  t.pricing_per_person ? `₹${t.pricing_per_person.toLocaleString("en-IN")}` : "On Request",
    rawPrice:    t.pricing_per_person ? `₹${t.pricing_per_person.toLocaleString("en-IN")}` : undefined,
    destination: t.destination?.name ?? "",
    image:       getCMSImageUrl(imgPath),
  };
}

const FALLBACK_TRIPS: TripCard[] = [
  { slug: "colors-of-rajasthan",   title: "Colors of Rajasthan in 9 Nights & 10 Days",          duration: "10 Days · 9 Nights", budgetFrom: "₹44,999", destination: "Rajasthan",        image: "/site-images/bg-home-page.jpg" },
  { slug: "wildlife-of-rajasthan", title: "Wildlife of Rajasthan in 5 Nights & 6 Days",         duration: "6 Days · 5 Nights",  budgetFrom: "₹24,999", destination: "Rajasthan",        image: "/site-images/search-images-8.jpg" },
  { slug: "offbeat-himachal",      title: "Offbeat Himachal: Kasol & Jibhi in 4 Nights & 5 Days", duration: "5 Days · 4 Nights",  budgetFrom: "₹14,999", destination: "Himachal Pradesh", image: "/site-images/singapore.jpg" },
  { slug: "dharamshala-dalhousie", title: "Getaway to Dharamshala & Dalhousie in 6 Nights & 7 Days", duration: "7 Days · 6 Nights",  budgetFrom: "₹27,999", destination: "Himachal Pradesh", image: "/site-images/dubai.jpg" },
  { slug: "royal-karnataka",       title: "Royal Retreat of Karnataka in 3 Nights & 4 Days",     duration: "4 Days · 3 Nights",  budgetFrom: "₹14,999", destination: "South India",      image: "/site-images/singapore.jpg" },
  { slug: "north-east-vacation",   title: "North East Vacation in 8 Nights & 9 Days",            duration: "9 Days · 8 Nights",  budgetFrom: "₹39,999", destination: "Northeast India",  image: "/site-images/search-images-8.jpg" },
];

function TripCardImage({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src);
  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setImgSrc("/site-images/bg-home-page.jpg")}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
    />
  );
}

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface Props {
  apiTrips?: CMSItinerary[];
  apiDestinations?: CMSDestination[];
}

export default function FeaturedItineraries({ apiTrips, apiDestinations }: Props) {
  const trips: TripCard[] =
    apiTrips && apiTrips.length > 0 ? apiTrips.slice(0, 6).map(mapAPITrip) : FALLBACK_TRIPS;

  const destFilters = apiDestinations && apiDestinations.length > 0
    ? apiDestinations.slice(0, 11).map((d) => d.name)
    : ["Bali", "Leh Ladakh", "Thailand", "Sri Lanka", "Singapore", "Vietnam", "Seychelles", "Himachal", "Uttarakhand", "Azerbaijan", "North East"];

  return (
    <section className="bg-white py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
        >
          <p className="section-label mb-3">Handpicked For You</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Our Picks <span className="text-blaze italic">For You</span>
            </h2>
            <Link to="/trips" className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1 flex-shrink-0">
              View all trips
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
          {trips.map((trip, i) => (
            <motion.article
              key={trip.slug + i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-ink/10 flex flex-col"
            >
              {/* Image */}
              <div className="relative aspect-[5/4] overflow-hidden">
                <TripCardImage src={trip.image} alt={trip.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-abyss/85 via-abyss/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-display font-bold text-white text-lg lg:text-xl leading-snug mb-1 line-clamp-2">
                    {trip.title}
                  </h3>
                  <p className="font-body text-white/75 text-xs">{trip.duration}</p>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex flex-col flex-1">
                {trip.destination && (
                  <span className="inline-block self-start font-body text-xs text-abyss bg-drift rounded-md px-2.5 py-1 mb-4">
                    {trip.destination}
                  </span>
                )}

                <div className="mb-4">
                  <p className="font-body text-[10px] font-semibold text-ink/40 uppercase tracking-widest">From</p>
                  <p className="font-display font-black text-xl text-abyss leading-tight">
                    {trip.budgetFrom}
                    <span className="text-sm font-normal text-ink/50">/person</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <Link
                    to={`/trips/${trip.slug}`}
                    className="inline-flex items-center justify-center gap-1.5 font-body text-sm font-semibold text-white bg-abyss hover:bg-abyss/90 rounded-lg py-2.5 transition-colors"
                  >
                    View Trip →
                  </Link>
                  <a
                    href={waLink({ trip: trip.title, slug: trip.slug, source: `home_trip_card_${trip.slug}` })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 font-body text-sm font-semibold text-white bg-[#25D366] hover:bg-[#22c55e] rounded-lg py-2.5 transition-colors"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Destination filter strip */}
        <div className="mt-12 flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <Link
            to="/trips"
            className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blaze text-white font-body text-sm font-semibold hover:bg-blaze/90 transition-colors"
          >
            All Trips
          </Link>
          {destFilters.map((d) => (
            <Link
              key={d}
              to={`/trips?destination=${encodeURIComponent(d)}`}
              className="flex-shrink-0 inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-dashed border-abyss/25 text-abyss/80 font-body text-sm hover:border-blaze hover:text-blaze transition-colors"
            >
              {d}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
