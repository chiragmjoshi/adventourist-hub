import { useRef, useState, MouseEvent } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function JourneyCTA() {
  const btnRef = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16 });
  const sy = useSpring(y, { stiffness: 220, damping: 16 });
  const [hover, setHover] = useState(false);

  function handleMove(e: MouseEvent<HTMLAnchorElement>) {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const px = e.clientX - (r.left + r.width / 2);
    const py = e.clientY - (r.top + r.height / 2);
    x.set(Math.max(-22, Math.min(22, px * 0.4)));
    y.set(Math.max(-22, Math.min(22, py * 0.4)));
  }

  return (
    <section className="relative z-10 overflow-hidden bg-[#0B0B0E] px-6 py-32 text-white sm:px-10 lg:px-20 lg:py-48">
      {/* radial accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(255,111,76,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-[11px] uppercase tracking-[0.4em] text-[#C9A86B]"
        >
          Your turn
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl text-4xl leading-[1.05] tracking-tight sm:text-7xl lg:text-[7rem]"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
        >
          Let's plan your <em className="text-[#C9A86B] not-italic">next journey.</em>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="mt-16"
        >
          <motion.a
            ref={btnRef}
            href="https://wa.me/919004204446"
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={handleMove}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
              setHover(false);
              x.set(0);
              y.set(0);
            }}
            style={{ x: sx, y: sy }}
            className="group relative flex h-44 w-44 items-center justify-center rounded-full bg-[#FF6F4C] text-center text-sm font-medium uppercase tracking-[0.2em] text-white shadow-[0_20px_60px_-15px_rgba(255,111,76,0.5)] sm:h-56 sm:w-56"
          >
            <motion.span
              animate={{ scale: hover ? 1.08 : 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-2"
            >
              Start
              <br />
              Planning
              <ArrowUpRight className="h-5 w-5" />
            </motion.span>
            <span className="absolute inset-0 rounded-full ring-1 ring-white/20" />
          </motion.a>
        </motion.div>

        <p className="mt-10 max-w-md text-sm text-white/50">
          Or call our team in Mumbai — we usually pick up on the first ring.
        </p>
      </div>
    </section>
  );
}