import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getCMSImageUrl, type CMSItinerary, type CMSDestination } from "@/site/lib/api";

interface Tile {
  name: string;
  count: number;
  image: string;
  isHero?: boolean;
  isMore?: boolean;
}

const DEST_IMAGES: Record<string, string> = {
  "Bali":       "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
  "Thailand":   "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=80",
  "Sri Lanka":  "https://images.unsplash.com/photo-1578005343432-bf1ab1b5e6f4?w=800&q=80",
  "Vietnam":    "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
  "Africa":     "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
  "Europe":     "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&q=80",
  "Leh Ladakh": "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=1200&q=80",
  "Rajasthan":  "https://images.unsplash.com/photo-1477587458883-47145ed31dfe?w=1200&q=80",
  "Kerala":     "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=80",
  "Himachal":   "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80",
  "Singapore":  "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
};

const FALLBACK_IMG = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

const FALLBACK: Tile[] = [
  { name: "Bali",       count: 8, image: DEST_IMAGES["Bali"],       isHero: true },
  { name: "Leh Ladakh", count: 6, image: DEST_IMAGES["Leh Ladakh"] },
  { name: "Thailand",   count: 5, image: DEST_IMAGES["Thailand"] },
  { name: "Sri Lanka",  count: 4, image: DEST_IMAGES["Sri Lanka"] },
  { name: "Vietnam",    count: 3, image: DEST_IMAGES["Vietnam"] },
  { name: "More",       count: 0, image: DEST_IMAGES["Europe"], isMore: true },
];

interface Props {
  apiDestinations?: CMSDestination[];
  apiTrips?: CMSItinerary[];
}

function buildTiles({ apiDestinations, apiTrips }: Props): Tile[] {
  if (!apiDestinations || apiDestinations.length === 0) return FALLBACK;

  // Count itineraries per destination id
  const counts = new Map<string | number, number>();
  (apiTrips || []).forEach((t) => {
    const id = t.destination?.id;
    if (id != null) counts.set(id, (counts.get(id) || 0) + 1);
  });

  const tiles = apiDestinations.slice(0, 5).map((d, i): Tile => ({
    name:  d.name,
    count: counts.get(d.id) || 0,
    image: getCMSImageUrl(d.pictures?.[0]?.file_path) || DEST_IMAGES[d.name] || FALLBACK_IMG,
    isHero: i === 0,
  }));
  tiles.push({
    name: "More",
    count: 0,
    image: getCMSImageUrl(apiDestinations[5]?.pictures?.[0]?.file_path) || DEST_IMAGES["Europe"] || FALLBACK_IMG,
    isMore: true,
  });
  return tiles;
}

export default function DestinationsGrid({ apiDestinations, apiTrips }: Props) {
  const tiles = buildTiles({ apiDestinations, apiTrips });

  return (
    <section className="bg-white pt-16 lg:pt-20 pb-20 lg:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
        >
          <p className="section-label mb-3">Where Do You Want To Go?</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Explore <span className="text-blaze italic">Destinations</span>
            </h2>
            <Link to="/trips" className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1">
              All destinations
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Bento grid: hero spans 2 cols x 2 rows on lg, others fill remaining */}
        <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[180px] lg:auto-rows-[220px] gap-4">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.name + i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06, duration: 0.45 }}
              className={`relative overflow-hidden rounded-2xl group ${tile.isHero ? "col-span-2 row-span-2" : ""}`}
            >
              <Link
                to={tile.isMore ? "/trips" : `/trips?destination=${encodeURIComponent(tile.name)}`}
                aria-label={tile.name}
                className="absolute inset-0 z-10"
              />
              <img
                src={tile.image}
                alt={tile.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-abyss/20 to-transparent" />
              <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-blaze rounded-2xl transition" />
              <div className="absolute bottom-0 left-0 p-4 lg:p-5">
                <h3 className={`font-display font-black text-white leading-tight ${tile.isHero ? "text-3xl lg:text-4xl" : "text-lg lg:text-xl"}`}>
                  {tile.isMore ? "More →" : tile.name}
                </h3>
                {tile.count > 0 && (
                  <p className="font-body text-white/70 text-xs mt-1">{tile.count} itineraries</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
