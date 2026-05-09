import { motion } from "framer-motion";

const values = [
  {
    icon: "☀️",
    bg: "bg-[#FF6F4C]",
    name: "Personalised",
    tagline: "Not packaged. Planned for you.",
    description: "Every trip is built around your travel style, budget, and the people you're going with. No copy-paste itineraries.",
  },
  {
    icon: "⛰️",
    bg: "bg-[#64CBB9]",
    name: "Expert",
    tagline: "Real experts, not call centres.",
    description: "Talk directly to Minal, Pinky, or our team — people who have actually been where you want to go.",
  },
  {
    icon: "🌊",
    bg: "bg-[#1A1D2E]",
    name: "Transparent",
    tagline: "What you see is what you pay.",
    description: "Zero booking fees. No hidden charges. No upsells. Just a fair price for a trip planned right.",
  },
  {
    icon: "❤️",
    bg: "bg-[#FDC436]",
    name: "With You",
    tagline: "We stay with you on the trip.",
    description: "Real humans on WhatsApp before, during, and after your journey. Not bots. Not scripts.",
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function BrandValues() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="section-label mb-3">WHY FAMILIES CHOOSE US</p>
          <h2 className="font-display font-black text-4xl lg:text-5xl text-[#1A1D2E]">
            We plan trips like{" "}
            <span className="text-[#FF6F4C] italic">a trusted friend would.</span>
          </h2>
          <p className="font-body text-lg text-[#666] mt-4 max-w-xl mx-auto">
            Not a booking platform. Not a call centre. A small team of real travellers who genuinely care about your trip.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
        >
          {values.map(({ icon, bg, name, tagline, description }) => (
            <motion.div
              key={name}
              variants={{
                hidden: { opacity: 0, y: 36, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease } },
              }}
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              className="border-2 border-dashed border-[#1A1D2E]/15 rounded-2xl p-6 bg-[#EEE5D5] cursor-default"
            >
              <div className={`${bg} w-14 h-14 rounded-xl flex items-center justify-center mb-5`}>
                <span className="text-2xl">{icon}</span>
              </div>
              <h3 className="font-display font-bold text-xl text-[#1A1D2E] mb-1">{name}</h3>
              <p className="font-display font-semibold text-sm text-[#1A1D2E]/70 mb-3 italic">
                {tagline}
              </p>
              <p className="font-body text-sm text-[#1A1D2E]/80 leading-relaxed">
                {description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
