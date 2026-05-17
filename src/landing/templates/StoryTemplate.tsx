import { useEffect, useState } from "react";
import { Check, Star, X } from "lucide-react";
import { formatINR } from "@/lib/formatINR";
import { LandingPageData, ItineraryData, FALLBACK_TESTIMONIALS, parseList } from "../shared";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import MobileStickyBar from "../components/MobileStickyBar";
import EnquiryForm from "../components/EnquiryForm";

interface Props {
  page: LandingPageData;
  itinerary?: ItineraryData | null;
}

export default function StoryTemplate({ page, itinerary }: Props) {
  const [showStickyForm, setShowStickyForm] = useState(false);
  const [stickyOpen, setStickyOpen] = useState(false);

  const destName = page.destinations?.name || "";
  const days = (itinerary?.itinerary_days as any[]) || [];
  const inclusions = parseList(page.custom_inclusions || itinerary?.inclusions);
  const exclusions = parseList(page.custom_exclusions || itinerary?.exclusions);

  useEffect(() => {
    const onScroll = () => setShowStickyForm(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-[#1A1D2E]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNavbar variant="dark" />

      {/* HERO */}
      <section
        className="relative min-h-[calc(100vh-56px)] flex items-center justify-center text-center"
        style={
          page.hero_image
            ? { backgroundImage: `url(${page.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#1A1D2E" }
        }
      >
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-14 text-white">
          {destName && (
            <span className="inline-block text-[11px] uppercase tracking-[0.3em] text-white/70 mb-6">
              {destName}
            </span>
          )}
          <h1
            className="font-black leading-tight mb-5"
            style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
          >
            {page.hero_headline}
          </h1>
          {page.hero_subtext && (
            <p className="text-lg md:text-xl text-white/85 max-w-2xl mx-auto mb-9">{page.hero_subtext}</p>
          )}
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => scrollTo("day-plan")}
              className="h-12 px-6 border-2 border-white text-white rounded-full font-bold hover:bg-white/10 transition-colors"
            >
              Explore This Trip ↓
            </button>
            <button
              onClick={() => scrollTo("enquire")}
              className="h-12 px-6 bg-[#FF6F4C] text-white rounded-full font-bold hover:bg-[#e5603f] transition-colors"
            >
              Get Free Quote →
            </button>
          </div>
        </div>
      </section>

      {/* TRIP OVERVIEW */}
      <section className="bg-white py-14 border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">Duration</div>
            <div className="text-xl md:text-2xl font-black">{page.stay_days || "Flexible"}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">From</div>
            <div className="text-xl md:text-2xl font-black">
              {page.budget ? formatINR(page.budget) : "On Request"}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">Best For</div>
            <div className="text-xl md:text-2xl font-black">
              {(page.suitable_for && page.suitable_for[0]) || "Everyone"}
            </div>
          </div>
        </div>
      </section>

      {/* DAY PLAN */}
      {days.length > 0 && (
        <section id="day-plan">
          {days.map((d, i) => (
            <div
              key={i}
              className={`py-16 md:py-20 ${i % 2 === 0 ? "bg-white" : "bg-[#EEE5D5]"}`}
            >
              <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-[1fr_2fr] gap-6 md:gap-12 items-start">
                <div
                  className="font-black leading-none text-[#FF6F4C]/20 select-none"
                  style={{ fontSize: "clamp(80px, 12vw, 140px)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-[#FF6F4C] font-bold mb-2">
                    Day {i + 1}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-black text-[#1A1D2E] mb-4">
                    {d.title || d.day_title || `Day ${i + 1}`}
                  </h3>
                  <p className="text-base text-gray-700 leading-relaxed whitespace-pre-line">
                    {d.description || d.day_description || ""}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* INCLUSIONS / EXCLUSIONS */}
      {(inclusions.length > 0 || exclusions.length > 0) && (
        <section className="bg-white py-16 border-t border-gray-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-12">
            {inclusions.length > 0 && (
              <div>
                <h3 className="text-2xl font-black mb-6">What's Included ✓</h3>
                <ul className="space-y-3">
                  {inclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                      <Check className="h-5 w-5 text-[#056147] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {exclusions.length > 0 && (
              <div>
                <h3 className="text-2xl font-black mb-6 text-gray-500">What's Not ✗</h3>
                <ul className="space-y-3">
                  {exclusions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-500">
                      <X className="h-5 w-5 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FORM */}
      <section id="enquire" className="bg-[#1A1D2E] py-20">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3 text-center">Ready to go?</h2>
          <p className="text-white/70 text-center mb-8">Tell us when, and we'll handle the rest.</p>
          <EnquiryForm page={page} variant="flat" />
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-[#1A1D2E] pt-4 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-3 gap-5">
            {FALLBACK_TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-7">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#FDC436] text-[#FDC436]" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4">"{t.text}"</p>
                <div className="text-sm font-bold text-[#1A1D2E]">{t.name}</div>
                <div className="text-xs text-gray-500">{t.trip}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
      <MobileStickyBar />
      <div className="md:hidden h-14" />

      {/* DESKTOP STICKY FORM */}
      {showStickyForm && (
        <div className="hidden md:block fixed right-6 bottom-6 z-40 w-[340px]">
          {stickyOpen ? (
            <div className="relative">
              <button
                onClick={() => setStickyOpen(false)}
                className="absolute -top-3 -right-3 z-10 h-8 w-8 rounded-full bg-[#1A1D2E] text-white flex items-center justify-center shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
              <EnquiryForm page={page} variant="compact" />
            </div>
          ) : (
            <button
              onClick={() => setStickyOpen(true)}
              className="w-full h-14 bg-[#FF6F4C] text-white font-bold rounded-full shadow-2xl hover:bg-[#e5603f] transition-colors"
            >
              Get Free Quote →
            </button>
          )}
        </div>
      )}
    </div>
  );
}