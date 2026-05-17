import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import heroImg from "@/assets/about-hero.jpg";

const HEADLINE = "We don't just plan trips. We design journeys.";

export default function HeroCinematic() {
  const reduce = useReducedMotion();
  const words = HEADLINE.split(" ");

  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden bg-[#0B0B0E] text-white">
      <motion.div
        initial={{ scale: 1.02 }}
        animate={reduce ? {} : { scale: 1.18 }}
        transition={{ duration: 18, ease: "linear" }}
        className="absolute inset-0"
      >
        <img
          src={heroImg}
          alt="Cinematic Himalayan landscape at golden hour"
          className="h-full w-full object-cover"
          width={1920}
          height={1088}
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

      <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-24 sm:px-10 lg:px-20 lg:pb-32">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mb-6 text-[11px] uppercase tracking-[0.4em] text-[#C9A86B]"
        >
          About Adventourist
        </motion.p>
        <h1
          className="max-w-5xl text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-[6.5rem]"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
        >
          {words.map((word, wi) => (
            <span key={wi} className="mr-[0.25em] inline-block overflow-hidden align-baseline">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: "0%" }}
                transition={{
                  delay: 0.35 + wi * 0.06,
                  duration: 0.9,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="inline-block will-change-transform"
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center text-white/70"
      >
        <span className="block text-[10px] uppercase tracking-[0.35em]">Scroll to explore</span>
        <motion.div
          animate={reduce ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="mt-2 flex justify-center"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}