import { useRef, useState, MouseEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const TEAM = [
  {
    name: "Minal Joshi",
    role: "Co-Founder & Travel Curator",
    bio: "Spent the last decade designing 600+ journeys across Asia. Believes every trip should feel like fiction.",
    accent: "linear-gradient(140deg,#FF6F4C 0%, #C9A86B 100%)",
    initials: "MJ",
  },
  {
    name: "Pinky Prajapati",
    role: "Senior Travel Expert",
    bio: "Our Himalayas specialist. Knows the difference between a good homestay and the right homestay.",
    accent: "linear-gradient(140deg,#64CBB9 0%, #056147 100%)",
    initials: "PP",
  },
  {
    name: "Mukund Joshi",
    role: "Co-Founder & CFO",
    bio: "Keeps the books honest and the partners paid on time. The reason we're proudly zero-debt.",
    accent: "linear-gradient(140deg,#1A1D2E 0%, #4A5470 100%)",
    initials: "MJ",
  },
];

export default function TeamShowcase() {
  return (
    <section className="bg-[#0B0B0E] px-6 py-28 text-white sm:px-10 lg:px-20 lg:py-44">
      <div className="mx-auto max-w-7xl">
        <p className="mb-6 text-[11px] uppercase tracking-[0.4em] text-[#C9A86B]">The People</p>
        <h2
          className="mb-16 max-w-3xl text-4xl tracking-tight sm:text-6xl lg:text-7xl"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
        >
          Meet the <em className="text-[#C9A86B] not-italic">travel designers</em>.
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((m, i) => (
            <TeamCard key={m.name} member={m} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TeamCard({ member, index }: { member: typeof TEAM[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [hover, setHover] = useState(false);

  const rx = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 15 });
  const ry = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 15 });

  const cursorX = useSpring(0, { stiffness: 280, damping: 28 });
  const cursorY = useSpring(0, { stiffness: 280, damping: 28 });

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mouseX.set(px);
    mouseY.set(py);
    cursorX.set(e.clientX - r.left);
    cursorY.set(e.clientY - r.top);
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ delay: index * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
      onMouseMove={handleMove}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1200 }}
      className="relative aspect-[3/4] cursor-none overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
    >
      <motion.div
        animate={{ scale: hover ? 1.05 : 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{ background: member.accent }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center text-[10rem] font-light text-white/15"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {member.initials}
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6">
        <h3
          className="text-2xl tracking-tight text-white"
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
        >
          {member.name}
        </h3>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-[#C9A86B]">{member.role}</p>
        <motion.p
          initial={false}
          animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 8 }}
          transition={{ duration: 0.35 }}
          className="mt-3 max-w-xs text-sm leading-relaxed text-white/70"
        >
          {member.bio}
        </motion.p>
      </div>

      <motion.div
        style={{ x: cursorX, y: cursorY, opacity: hover ? 1 : 0 }}
        className="pointer-events-none absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF6F4C] text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-lg">
          Explore
        </div>
      </motion.div>
    </motion.div>
  );
}