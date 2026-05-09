import { motion } from "framer-motion";

const values = [
  {
    icon: "☀️",
    bg: "bg-blaze",
    name: "Personalised",
    tagline: "Not packaged. Planned for you.",
    description: "Every trip is built around your travel style, budget, and the people you're going with. No copy-paste itineraries.",
  },
  {
    icon: "⛰️",
    bg: "bg-lagoon",
    name: "Expert",
    tagline: "Real experts, not call centres.",
    description: "Talk directly to Minal, Pinky, or our team — people who have actually been where you want to go.",
  },
  {
    icon: "🌊",
    bg: "bg-abyss",
    name: "Transparent",
    tagline: "What you see is what you pay.",
    description: "Zero booking fees. No hidden charges. No upsells. Just a fair price for a trip planned right.",
  },
  {
    icon: "❤️",
    bg: "bg-horizon",
    name: "With You",
    tagline: "We stay with you on the trip.",
    description: "Real humans on WhatsApp before, during, and after your journey. Not bots. Not scripts.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function BrandValues() {
  return (
    <section className="py-20 lg:py-24 px-4 bg-drift">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-14 max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="section-label mb-3">Why Families Choose Us</p>
          <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss leading-tight">
            We plan trips like <span className="text-blaze italic">a trusted friend would.</span>
          </h2>
          <p className="font-body text-base lg:text-lg text-ink/60 mt-5">
            Not a booking platform. Not a call centre. A small team of real travellers who genuinely care about your trip.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease }}
              className="border-2 border-dashed border-abyss/15 rounded-2xl p-6 bg-drift/60 hover:bg-white/60 transition-colors"
            >
              <div className={`${v.bg} w-14 h-14 rounded-xl flex items-center justify-center mb-5 shadow-sm`}>
                <span className="text-2xl" aria-hidden="true">{v.icon}</span>
              </div>
              <h3 className="font-display font-bold text-xl text-abyss mb-1">{v.name}</h3>
              <p className="font-display font-semibold text-sm text-abyss/70 mb-3 italic">{v.tagline}</p>
              <p className="font-body text-sm text-abyss/80 leading-relaxed">{v.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
