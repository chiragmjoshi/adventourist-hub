import { useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const REVIEWS = [
  { q: "Exceptional experience with Adventourist!", by: "Priya R." },
  { q: "Minal and the team are absolutely amazing!", by: "Karan S." },
  { q: "Nothing short of amazing. Bali was a dream.", by: "Anaya M." },
  { q: "Best Ladakh trip we ever could have asked for.", by: "Rohit & Family" },
  { q: "Felt like every detail was thought of in advance.", by: "Neha T." },
  { q: "Honest, transparent and incredibly responsive.", by: "Vikram B." },
  { q: "Will not book through anyone else again.", by: "Tanvi K." },
  { q: "Made our honeymoon truly unforgettable.", by: "Aarav & Sia" },
];

function Row({ direction = "left", duration = 40 }: { direction?: "left" | "right"; duration?: number }) {
  const [paused, setPaused] = useState(false);
  const items = [...REVIEWS, ...REVIEWS];
  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <motion.div
        className="flex w-max gap-6 py-4"
        animate={
          paused
            ? { x: direction === "left" ? "-50%" : "0%" }
            : { x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"] }
        }
        transition={{
          duration,
          repeat: paused ? 0 : Infinity,
          ease: "linear",
        }}
      >
        {items.map((r, i) => (
          <div
            key={i}
            className="flex w-[320px] shrink-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm sm:w-[400px]"
          >
            <div className="flex gap-1 text-[#FDC436]">
              {[...Array(5)].map((_, s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <p
              className="text-lg leading-snug text-white/90"
              style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
            >
              “{r.q}”
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">{r.by}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function ReviewsMarquee() {
  return (
    <section className="relative bg-[#0B0B0E] py-20 text-white lg:py-28">
      <div className="mx-auto mb-12 max-w-7xl px-6 sm:px-10 lg:px-20">
        <p className="mb-4 text-[11px] uppercase tracking-[0.4em] text-[#C9A86B]">
          250+ five-star reviews
        </p>
        <h2
          className="max-w-3xl text-3xl tracking-tight sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
        >
          Loved by travellers across India.
        </h2>
      </div>
      <div className="space-y-4">
        <Row direction="left" duration={45} />
        <Row direction="right" duration={55} />
      </div>
    </section>
  );
}