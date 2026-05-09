import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const testimonials = [
  {
    name:        "Lata Valera",
    destination: "Thailand",
    text:        "Exceptional experience with Adventourist Travel Co. Everything was managed really well. From hotels to activities — all seamless. I highly recommend them if you're planning any vacation.",
    avatar:      "LV",
  },
  {
    name:        "Joiston & Priya",
    destination: "Bali · Honeymoon",
    text:        "Minal and the team are absolutely amazing. They were extremely patient, kind and attentive. From hotel bookings to planning, to making changes while in Bali — Adventourist were right by our side.",
    avatar:      "JP",
  },
  {
    name:        "Pranit Jaiswal",
    destination: "Leh Ladakh",
    text:        "The Ladakh trip was beyond expectations. Every detail was taken care of — permits, hotels in remote areas, the whole route was perfect. Will definitely book again.",
    avatar:      "PJ",
  },
  {
    name:        "Aman Rana",
    destination: "Singapore & Malaysia",
    text:        "Booked a family trip through Adventourist and it was one of the best decisions. The kids loved every bit of it. Zero stress, everything pre-arranged.",
    avatar:      "AR",
  },
  {
    name:        "Neha Singhi",
    destination: "Seychelles",
    text:        "Dream honeymoon made real. The resort selection was impeccable, activities were perfectly timed, and the team was always reachable. Could not have asked for more.",
    avatar:      "NS",
  },
  {
    name:        "Amyn Ghadiali",
    destination: "Vietnam",
    text:        "Travelled solo to Vietnam with an Adventourist itinerary. The local guides they arranged were fantastic. The food trail in Hanoi was a highlight I'll never forget.",
    avatar:      "AG",
  },
];

// Duplicate for seamless marquee loop
const marqueeItems = [...testimonials, ...testimonials];

function StarRating() {
  return (
    <div className="flex gap-0.5 mb-4">
      {[...Array(5)].map((_, i) => (
        <svg key={i} className="w-4 h-4 text-horizon"  viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="bg-drift topo-texture py-20 lg:py-28 overflow-hidden">
      <div className="relative z-10">
        {/* Header */}
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-14"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="section-label mb-3">Real Experiences</p>
          <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
            Travellers Who <span className="text-blaze italic">Love Us</span>
          </h2>
          <a
            href="https://g.co/kgs/adventourist"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 font-body text-sm text-ink/50 hover:text-blaze transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" >
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            4.8 ★ on Google Reviews
          </a>
        </motion.div>

        {/* CSS-only marquee track — no JS needed */}
        <div className="flex gap-6 animate-marquee" style={{ width: "max-content" }}>
          {marqueeItems.map((t, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-80 bg-white rounded-2xl p-6 shadow-sm border border-ink/6"
            >
              <p className="font-display font-black text-5xl text-blaze/20 leading-none mb-1 select-none">&ldquo;</p>

              <StarRating />

              <p className="font-body text-sm text-ink/70 leading-relaxed mb-5">
                {t.text}
              </p>

              <div className="flex items-center gap-3 pt-4 border-t border-ink/8">
                <div className="w-9 h-9 rounded-full bg-blaze/10 flex items-center justify-center flex-shrink-0">
                  <span className="font-display font-bold text-xs text-blaze">{t.avatar}</span>
                </div>
                <div>
                  <p className="font-display font-semibold text-sm text-abyss">{t.name}</p>
                  <p className="font-body text-xs text-ink/40">{t.destination}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <motion.div
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16">
            {[
              { value: "250+",  label: "Happy Travellers" },
              { value: "4.8 ★", label: "Google Rating" },
              { value: "50+",   label: "Destinations" },
              { value: "₹0",    label: "Extra Booking Fees" },
            ].map((s) => (
              <motion.div
                key={s.label}
                className="text-center"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
                }}
              >
                <p className="font-display font-black text-3xl lg:text-4xl text-abyss">{s.value}</p>
                <p className="font-body text-xs text-ink/50 mt-1 uppercase tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
