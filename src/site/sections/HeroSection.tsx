import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { WHATSAPP_NUMBER } from "@/site/lib/constants";

const destinations = [
  {
    name: "Bali",
    tagline: "Island of the Gods",
    region: "Indonesia",
    image: "/site-images/bg-home-page.jpg",
    color: "from-orange-900/70 via-orange-800/50 to-transparent",
  },
  {
    name: "Leh Ladakh",
    tagline: "Where Sky Meets Earth",
    region: "India",
    image: "/site-images/search-images-8.jpg",
    color: "from-blue-900/70 via-blue-800/50 to-transparent",
  },
  {
    name: "Singapore",
    tagline: "The Lion City",
    region: "Southeast Asia",
    image: "/site-images/singapore.jpg",
    color: "from-teal-900/70 via-teal-800/50 to-transparent",
  },
  {
    name: "Dubai",
    tagline: "Where Dreams Are Built",
    region: "UAE",
    image: "/site-images/dubai.jpg",
    color: "from-amber-900/70 via-amber-800/50 to-transparent",
  },
];

const headline = [
  { text: "Travel",    italic: false, color: "text-abyss" },
  { text: "Designed", italic: true,  color: "text-blaze" },
  { text: "For You.", italic: false, color: "text-abyss" },
];

const wordVariants: any = {
  hidden:  { y: 50, opacity: 0 },
  visible: (i: number) => ({
    y: 0, opacity: 1,
    transition: { delay: i * 0.12, type: "spring", damping: 22, stiffness: 200 },
  }),
};

const subtextVariants: any = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { delay: 0.55, duration: 0.5 } },
};

const ctaVariants: any = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { delay: 0.75, type: "spring", damping: 18 } },
};

export default function HeroSection() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % destinations.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const dest = destinations[current];

  return (
    <section className="relative min-h-screen flex items-center bg-drift topo-texture overflow-hidden text-drift">
      {/* Topo lines color */}
      <style>{`.topo-texture::before { color: #D4C9B5; }`}</style>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 lg:pt-20 lg:pb-0">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-0 min-h-[calc(100vh-5rem)]">

          {/* ── LEFT 60% ── */}
          <div className="w-full lg:w-[58%] flex flex-col justify-center py-8 lg:py-20 lg:pr-12">

            {/* Brand mark */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: "spring", damping: 20 }}
              className="mb-6"
              style={{ width: 'clamp(52px, 6vw, 72px)', height: 'clamp(52px, 6vw, 72px)' }}
            >
              <div className="relative w-full h-full">
                <img                   src="/logo/logo-square-color.svg"
                  alt=""                   className="object-contain"                   aria-hidden="true"
                />
              </div>
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="section-label mb-6"
            >
              250+ Families Trust Us With Their Holidays
            </motion.p>

            {/* Animated headline */}
            <h1 className="font-display font-black leading-[0.95] mb-6 overflow-hidden">
              {headline.map((word, i) => (
                <motion.span
                  key={word.text}
                  custom={i}
                  variants={wordVariants}
                  initial="hidden"
                  animate="visible"
                  className={`block text-[clamp(3.5rem,8vw,6rem)] ${word.color} ${word.italic ? "italic" : ""}`}
                >
                  {word.text}
                </motion.span>
              ))}
            </h1>

            {/* Subtext */}
            <motion.p
              variants={subtextVariants}
              initial="hidden"
              animate="visible"
              className="font-body text-lg lg:text-xl text-ink/60 max-w-lg leading-relaxed mb-10"
            >
              We don&apos;t sell packages. We plan vacations around you — your time, your pace, your people.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={ctaVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/trips"
                className="inline-flex items-center justify-center gap-2 bg-blaze text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-blaze/90 active:scale-[0.97] transition-all shadow-lg shadow-blaze/25"
              >
                Plan My Trip
                <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%27d%20like%20to%20plan%20a%20trip.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border-2 border-horizon text-abyss font-display font-bold text-base px-8 py-4 rounded-full hover:bg-horizon hover:text-abyss active:scale-[0.97] transition-all"
              >
                <svg className="w-5 h-5"  viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Talk to a Travel Expert
              </a>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex flex-wrap gap-5 mt-10 pt-8 border-t border-ink/10"
            >
              {[
                { num: "250+", label: "Families Travelled" },
                { num: "4.8★", label: "Google Rating" },
                { num: "50+", label: "Destinations" },
                { num: "₹0", label: "Booking Fees" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-display font-black text-2xl text-abyss">{s.num}</p>
                  <p className="font-body text-xs text-ink/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ── RIGHT 40% ── */}
          <div className="w-full lg:w-[42%] relative flex items-center justify-center lg:h-[calc(100vh-5rem)]">
            <div className="relative w-full max-w-sm lg:max-w-none h-[420px] lg:h-[580px] rounded-3xl overflow-hidden shadow-2xl">

              {/* Rotating destination image */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <img                     src={dest.image}
                    alt={dest.name}                     className="object-cover"
                  />
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${dest.color}`} />
                </motion.div>
              </AnimatePresence>

              {/* Destination info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`label-${current}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="text-white/70 font-body text-sm mb-1">{dest.region}</p>
                    <h2 className="text-white font-display font-black text-3xl leading-tight">{dest.name}</h2>
                    <p className="text-white/60 font-body text-sm mt-1">{dest.tagline}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slide indicators */}
              <div className="absolute top-5 right-5 flex gap-2 z-10">
                {destinations.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`View ${destinations[i].name}`}
                    className="p-3 -m-3 flex items-center justify-center focus-visible:outline-none"
                  >
                    <span className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === current ? "w-8 bg-white" : "w-1.5 bg-white/40"
                    }`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, type: "spring" }}
              className="absolute -left-4 top-16 lg:top-24 bg-white rounded-2xl shadow-xl px-4 py-3"
            >
              <p className="font-display font-bold text-abyss text-sm">✈ From ₹45,000</p>
              <p className="font-body text-xs text-ink/50 mt-0.5">Curated trips, all-inclusive</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.3, type: "spring" }}
              className="absolute -right-2 lg:-right-6 bottom-24 bg-horizon rounded-2xl shadow-xl px-4 py-3"
            >
              <p className="font-display font-bold text-abyss text-sm">⚡ 2hr Response</p>
              <p className="font-body text-xs text-abyss/60 mt-0.5">Mon–Sat, 9am–9pm IST</p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-ink/30 hidden lg:flex"
      >
        <span className="font-body text-xs tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.4 }}
          className="w-px h-8 bg-ink/20"
        />
      </motion.div>
    </section>
  );
}
