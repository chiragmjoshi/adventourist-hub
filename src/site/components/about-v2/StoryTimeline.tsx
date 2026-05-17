import { useRef } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import img1 from "@/assets/about-story-1.jpg";
import img2 from "@/assets/about-story-2.jpg";
import img3 from "@/assets/about-story-3.jpg";
import img4 from "@/assets/about-story-4.jpg";

const STEPS = [
  {
    year: "2018",
    title: "A spark in Bhutan",
    body: "A road trip across Bhutan returned us with notebooks full of itineraries. A friend asked, ‘But who will book this for us?’ — and the idea took shape.",
    image: img1,
  },
  {
    year: "2019",
    title: "Adventourist is born",
    body: "We started with our personal favourite, Ladakh. Authentic advice, carefully crafted itineraries, and a warm personalised approach — and it took off.",
    image: img2,
  },
  {
    year: "2024",
    title: "Record post-Covid year",
    body: "We survived the pause and came back stronger. A record sales year, hundreds of seamless trips, and our 250th 5-star review.",
    image: img3,
  },
  {
    year: "Today",
    title: "A team of ten",
    body: "Ten travel designers, photographers and ops minds in Mumbai, designing journeys for couples, families and friends across 30+ destinations.",
    image: img4,
  },
];

export default function StoryTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const activeIndex = useTransform(scrollYProgress, (p) =>
    Math.min(STEPS.length - 1, Math.floor(p * STEPS.length * 0.999))
  );

  return (
    <section
      ref={ref}
      className="relative bg-[#1A1D2E] text-white"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:px-10 lg:grid-cols-2 lg:gap-16 lg:px-20 lg:py-20">
        {/* Left sticky */}
        <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center">
          <p className="mb-5 text-[11px] uppercase tracking-[0.4em] text-[#FF6F4C]">Our Story</p>
          <h2
            className="mb-8 text-4xl tracking-tight sm:text-6xl lg:text-7xl"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
          >
            How it all <em className="text-[#FF6F4C] not-italic">started</em>
          </h2>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-white/5 lg:aspect-[4/5] lg:max-w-md">
            <ActiveImage activeIndex={activeIndex} />
          </div>
        </div>

        {/* Right timeline */}
        <div className="relative pl-8 lg:pl-12">
          {/* rail */}
          <div className="absolute left-2 top-0 h-full w-px bg-white/10 lg:left-4" />
          <motion.div
            style={{ scaleY: lineScale, transformOrigin: "top" }}
            className="absolute left-2 top-0 h-full w-px bg-gradient-to-b from-[#FF6F4C] via-[#FDC436] to-[#FF6F4C] lg:left-4"
          />

          <div className="space-y-20 py-8 lg:space-y-28">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.year}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-120px" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <span className="absolute -left-[26px] top-2 h-3 w-3 rounded-full bg-[#FF6F4C] ring-4 ring-[#1A1D2E] lg:-left-[34px]" />
                <p className="mb-3 text-xs uppercase tracking-[0.35em] text-[#FDC436]">{s.year}</p>
                <h3
                  className="mb-4 text-3xl leading-tight tracking-tight sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
                >
                  {s.title}
                </h3>
                <p className="max-w-md text-base leading-relaxed text-white/65">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import type { MotionValue } from "framer-motion";

function ActiveImage({ activeIndex }: { activeIndex: MotionValue<number> }) {
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(activeIndex, "change", (v) => setIdx(Math.round(v)));
  return (
    <AnimatePresence mode="wait">
      <motion.img
        key={idx}
        src={STEPS[idx].image}
        alt={STEPS[idx].title}
        loading="lazy"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </AnimatePresence>
  );
}