import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { waLink } from "@/site/lib/utils";

const destinations = [
  { name: "Leh Ladakh", tagline: "Where Sky Meets Earth",   region: "India",         image: "/site-images/search-images-8.jpg" },
  { name: "Bali",       tagline: "Island of the Gods",      region: "Indonesia",     image: "/site-images/bg-home-page.jpg" },
  { name: "Singapore",  tagline: "The Lion City",           region: "Southeast Asia",image: "/site-images/singapore.jpg" },
  { name: "Dubai",      tagline: "Where Dreams Are Built",  region: "UAE",           image: "/site-images/dubai.jpg" },
];

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % destinations.length), 4500);
    return () => clearInterval(t);
  }, []);

  const dest = destinations[current];

  return (
    <section className="relative bg-drift topo-texture overflow-hidden">
      <style>{`.topo-texture::before { color: #D4C9B5; }`}</style>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-10">

          {/* LEFT */}
          <div className="w-full lg:w-[58%] flex flex-col justify-center">
            {/* Brand mark */}
            <div className="mb-6 w-14 h-14 lg:w-16 lg:h-16">
              <img
                src="/logo/logo-square-color.svg"
                alt="Adventourist"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Eyebrow */}
            <p className="section-label mb-5">250+ Families Trust Us With Their Holidays</p>

            {/* Headline */}
            <h1 className="font-display font-black leading-[0.92] mb-6">
              <span className="block text-[clamp(2.75rem,8vw,6rem)] text-abyss">Travel</span>
              <span className="block text-[clamp(2.75rem,8vw,6rem)] text-blaze italic">Designed</span>
              <span className="block text-[clamp(2.75rem,8vw,6rem)] text-abyss">For You.</span>
            </h1>

            <p className="font-body text-lg lg:text-xl text-ink/60 max-w-lg leading-relaxed mb-9">
              We don't sell packages. We plan vacations around you — your time, your pace, your people.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/trips"
                className="inline-flex items-center justify-center gap-2 bg-blaze text-white font-display font-bold text-base px-7 py-4 rounded-full hover:bg-blaze/90 active:scale-[0.97] transition-all shadow-lg shadow-blaze/25"
              >
                Plan My Trip
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href={waLink({ source: "home_hero" })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border-2 border-horizon text-abyss bg-white/40 font-display font-bold text-base px-7 py-4 rounded-full hover:bg-horizon transition-all"
              >
                <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Talk to a Travel Expert
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-x-10 gap-y-4 mt-10 pt-8 border-t border-ink/10">
              {[
                { num: "250+", label: "Families Travelled" },
                { num: "4.8★", label: "Google Rating" },
                { num: "50+",  label: "Destinations" },
                { num: "₹0",   label: "Booking Fees" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display font-black text-2xl text-abyss">{s.num}</p>
                  <p className="font-body text-xs text-ink/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT */}
          <div className="w-full lg:w-[42%] relative flex items-center justify-center">
            <div className="relative w-full max-w-md lg:max-w-none aspect-[4/5] lg:h-[580px] lg:aspect-auto rounded-3xl overflow-hidden shadow-2xl">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img
                    src={dest.image}
                    alt={`${dest.name} — ${dest.tagline}`}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-abyss/80 via-abyss/20 to-transparent" />
                </motion.div>
              </AnimatePresence>

              {/* Destination info */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`label-${current}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-white/70 font-body text-sm mb-1">{dest.region}</p>
                    <h2 className="text-white font-display font-black text-3xl leading-tight">{dest.name}</h2>
                    <p className="text-white/70 font-body text-sm mt-1">{dest.tagline}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide indicators */}
              <div className="absolute top-5 right-5 flex gap-2 z-10">
                {destinations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Show ${destinations[i].name}`}
                    className="p-2 -m-2"
                  >
                    <span className={`block h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-8 bg-white" : "w-1.5 bg-white/40"}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Floating badges — positioned outside image edges */}
            <div className="hidden lg:block absolute -top-2 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 z-20">
              <p className="font-display font-bold text-abyss text-sm">✈ From ₹45,000</p>
              <p className="font-body text-xs text-ink/50 mt-0.5">Curated trips, all-inclusive</p>
            </div>

            <div className="hidden lg:block absolute -bottom-3 -right-3 bg-horizon rounded-2xl shadow-xl px-4 py-3 z-20">
              <p className="font-display font-bold text-abyss text-sm">⚡ 2hr Response</p>
              <p className="font-body text-xs text-abyss/60 mt-0.5">Mon–Sat, 9am–9pm IST</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
