import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, BadgeIndianRupee, HeartHandshake } from "lucide-react";

const CARDS = [
  {
    icon: Sparkles,
    title: "Handcrafted",
    body: "Every itinerary is hand-built by a travel designer who has actually been there. No templates, no copy-paste.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Honest Pricing",
    body: "Zero booking fees. Transparent vendor costs. We earn from partners, never from hidden mark-ups on you.",
  },
  {
    icon: HeartHandshake,
    title: "Zero Stress",
    body: "One concierge on WhatsApp from inspiration to the moment you're back home. We sweat the details so you don't.",
  },
];

export default function AdventouristWay() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 30%"],
  });
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);

  return (
    <section
      ref={ref}
      className="relative bg-[#F4EFE6] px-6 py-20 text-[#1A1D2E] sm:px-10 lg:px-20 lg:py-28"
    >
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div>
          <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-[#FF6F4C]">
            The Adventourist Way
          </p>
          <motion.h2
            style={{ opacity }}
            className="text-3xl leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.75rem]"
          >
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}>
              No more endless scrolling. No more mismatched bookings.{" "}
              <em className="text-[#FF6F4C] not-italic">Just stress-free, deeply personal travel.</em>
            </span>
          </motion.h2>
        </div>

        <div className="flex flex-col gap-5">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                delay: i * 0.12,
                type: "spring",
                stiffness: 110,
                damping: 18,
              }}
              className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-7 shadow-[0_10px_40px_-20px_rgba(26,29,46,0.25)]"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FF6F4C] text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <h3
                className="mb-2 text-2xl tracking-tight"
                style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
              >
                {c.title}
              </h3>
              <p className="text-sm leading-relaxed text-[#1A1D2E]/70">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}