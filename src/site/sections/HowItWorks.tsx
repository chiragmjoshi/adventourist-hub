import { motion } from "framer-motion";
import { waLink } from "@/site/lib/utils";

const steps = [
  {
    number: "01",
    title: "Tell Us What You're Looking For",
    desc: "Share your destination, travel dates, group size, and budget. Even if you're not sure — we'll help you figure it out.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "We Build Your Custom Plan",
    desc: "Your dedicated travel expert designs a day-by-day itinerary — handpicked stays, real local insights, and everything tailored to your group.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "You Show Up. We Handle Everything.",
    desc: "We book it all — stays, transfers, guides. And we're on WhatsApp throughout your trip if you need anything.",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function HowItWorks() {
  return (
    <section className="bg-horizon topo-texture py-20 lg:py-28 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-abyss/50 mb-3">How It Works</p>
          <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
            Your vacation, <span className="text-blaze italic">planned by a real expert.</span>
          </h2>
        </motion.div>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-6">
          {/* Connector line — sits behind, runs from middle of step 1 circle to middle of step 3 circle */}
          <div
            className="hidden lg:block absolute top-8 left-[16.66%] right-[16.66%] border-t-2 border-dashed border-abyss/25 pointer-events-none"
            aria-hidden="true"
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.55, delay: i * 0.12, ease }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-abyss flex items-center justify-center mb-6 shadow-lg shadow-black/20 ring-4 ring-horizon">
                <span className="font-display font-black text-white text-xl">{s.number}</span>
              </div>
              <div className="text-abyss/60 mb-4">{s.icon}</div>
              <h3 className="font-display font-bold text-abyss text-xl mb-3">{s.title}</h3>
              <p className="font-body text-abyss/70 text-sm leading-relaxed max-w-xs">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-14">
          <a
            href={waLink({ source: "home_how_it_works" })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-abyss text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-abyss/90 active:scale-[0.97] transition-all shadow-lg"
          >
            Plan My Trip — It's Free
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
