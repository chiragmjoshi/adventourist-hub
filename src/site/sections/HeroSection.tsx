import { Link } from "react-router-dom";
import { waLink } from "@/site/lib/utils";

export default function HeroSection() {
  return (
    <section className="relative w-full min-h-[92vh] bg-abyss overflow-hidden -mt-16 lg:-mt-20">
      {/* Full-bleed background image (LCP candidate — eager, high priority) */}
      <img
        src="/site-images/hero-home-1600.webp"
        srcSet="/site-images/hero-home-800.webp 800w, /site-images/hero-home-1600.webp 1600w"
        sizes="100vw"
        width={1600}
        height={906}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
        decoding="sync"
        // @ts-expect-error fetchpriority is a valid HTML attribute, React types lag
        fetchpriority="high"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(26, 29, 46, 0.35)" }} />
      <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/30 to-transparent" />

      {/* Giant translucent wordmark */}
      <div className="hidden md:flex absolute inset-x-0 top-[18%] justify-center pointer-events-none select-none px-4">
        <span
          className="font-display font-black tracking-tight text-drift/[0.10] leading-none whitespace-nowrap"
          style={{ fontSize: "clamp(5rem, 17vw, 18rem)" }}
          aria-hidden="true"
        >
          ADVENTOURIST
        </span>
      </div>

      {/* Content stack */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-8 lg:pb-10 min-h-[92vh] flex flex-col justify-end">
        <div className="inline-flex items-center gap-2 self-start bg-white/10 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 mb-6">
          <span className="block w-6 h-px bg-horizon" />
          <span className="font-body text-white/90 text-xs sm:text-sm tracking-wide">
            Crafting Journeys Since 2018
          </span>
        </div>

        <span className="block font-body text-white/70 text-xs sm:text-sm tracking-[0.2em] uppercase mb-3">
          Travel Designed For You
        </span>
        <h1 className="font-display font-black leading-[0.92] mb-6 max-w-4xl">
          <span className="block text-white" style={{ fontSize: "clamp(2.5rem, 7vw, 6.25rem)" }}>Custom Trips</span>
          <span className="block text-blaze italic" style={{ fontSize: "clamp(2.5rem, 7vw, 6.25rem)" }}>Planned</span>
          <span className="block text-white" style={{ fontSize: "clamp(2.5rem, 7vw, 6.25rem)" }}>Around You.</span>
        </h1>

        <p className="font-body text-base sm:text-lg text-white/85 max-w-xl leading-relaxed mb-8">
          We don't sell packages. We plan vacations around you — your time, your pace, your people.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            to="/trips"
            className="inline-flex items-center justify-center gap-2 bg-blaze text-white font-display font-bold text-base px-7 py-4 rounded-full hover:bg-blaze/90 active:scale-[0.97] transition-all shadow-lg shadow-blaze/30"
          >
            Plan My Trip
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-blaze ml-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 17L17 7M17 7H8M17 7V16" />
              </svg>
            </span>
          </Link>
          <a
            href={waLink({ source: "home_hero" })}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md border border-white/40 text-white font-display font-bold text-base px-7 py-4 rounded-full hover:bg-white/20 transition-all"
          >
            <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Talk to a Travel Expert
          </a>
        </div>

        <p className="font-body text-white/60 text-xs sm:text-sm tracking-[0.2em] uppercase">
          Bali · Leh Ladakh · Singapore · Dubai · Thailand · Kerala
        </p>
      </div>
    </section>
  );
}