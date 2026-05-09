import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getCMSImageUrl, type CMSDestination } from "@/site/lib/api";

interface Tile { name: string; count: number; image: string; span: string; size: string; }

const SPANS  = ["lg:col-span-2 lg:row-span-2", "", "", "", "", ""];
const SIZES  = ["large", "medium", "medium", "small", "small", "small"];
const FALLBACK_TILES: Tile[] = [
  { name: "Bali",       count: 8, image: "/site-images/bg-home-page.jpg",     span: SPANS[0], size: SIZES[0] },
  { name: "Leh Ladakh", count: 6, image: "/site-images/search-images-8.jpg",  span: SPANS[1], size: SIZES[1] },
  { name: "Thailand",   count: 5, image: "/site-images/singapore.jpg",        span: SPANS[2], size: SIZES[2] },
  { name: "Sri Lanka",  count: 4, image: "/site-images/malaysia.jpg",         span: SPANS[3], size: SIZES[3] },
  { name: "Singapore",  count: 3, image: "/site-images/dubai.jpg",            span: SPANS[4], size: SIZES[4] },
  { name: "More →",     count: 0, image: "/site-images/bg-home-page.jpg",     span: SPANS[5], size: SIZES[5] },
];

function buildTiles(apiDestinations?: CMSDestination[]): Tile[] {
  if (!apiDestinations || apiDestinations.length === 0) return FALLBACK_TILES;
  const dests = apiDestinations.slice(0, 5).map((d, i): Tile => ({
    name:  d.name,
    count: 0,
    image: getCMSImageUrl(d.pictures?.[0]?.file_path),
    span:  SPANS[i] ?? "",
    size:  SIZES[i] ?? "small",
  }));
  dests.push({ name: "More →", count: 0, image: getCMSImageUrl(apiDestinations[5]?.pictures?.[0]?.file_path) || "/site-images/bg-home-page.jpg", span: SPANS[5], size: SIZES[5] });
  return dests;
}

export default function DestinationsGrid({ apiDestinations }: { apiDestinations?: CMSDestination[] }) {
  const tiles = buildTiles(apiDestinations);
  return (
    <section className="bg-white py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="section-label mb-3">Where Do You Want To Go?</p>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Explore <span className="text-blaze italic">Destinations</span>
            </h2>
            <Link to="/trips"
              className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              All destinations
              <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px] lg:auto-rows-[220px]">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              className={`relative overflow-hidden rounded-2xl group cursor-pointer ${tile.span}`}
            >
              <Link to={tile.name === "More →" ? "/trips" : `/trips?destination=${encodeURIComponent(tile.name)}`}
                className="absolute inset-0 z-10"
                aria-label={tile.name}
              />

              <img                 src={tile.image}
                alt={tile.name}                 className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
              />

              {/* Gradient + glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-abyss/20 to-transparent" />
              <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-blaze rounded-2xl transition-all duration-300" />

              {/* Text */}
              <div className="absolute bottom-0 left-0 p-4 lg:p-5">
                <h3 className={`font-display font-black text-white leading-tight ${
                  tile.size === "large" ? "text-3xl lg:text-4xl" : "text-lg lg:text-xl"
                }`}>
                  {tile.name}
                </h3>
                {tile.count > 0 && (
                  <p className="font-body text-white/60 text-xs mt-1">{tile.count} itineraries</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
