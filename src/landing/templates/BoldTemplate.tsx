import { useState } from "react";
import { Check, ChevronDown, Star, X } from "lucide-react";
import { formatINR } from "@/lib/formatINR";
import { LandingPageData, ItineraryData, FALLBACK_TESTIMONIALS, parseList, WHATSAPP_URL } from "../shared";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import MobileStickyBar from "../components/MobileStickyBar";
import EnquiryForm from "../components/EnquiryForm";

interface Props {
  page: LandingPageData;
  itinerary?: ItineraryData | null;
}

export default function BoldTemplate({ page, itinerary }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const destName = page.destinations?.name || "";
  const days = (itinerary?.itinerary_days as any[]) || [];
  const inclusions = parseList(page.custom_inclusions || itinerary?.inclusions);
  const gallery = page.gallery || [];

  const scrollToForm = () => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-[#1A1D2E]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNavbar />

      {/* HERO */}
      <section
        className="relative min-h-[640px] md:min-h-[calc(100vh-56px)] flex items-center"
        style={
          page.hero_image
            ? { backgroundImage: `url(${page.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#1A1D2E" }
        }
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/20" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full py-10 md:py-0 grid md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 text-white">
            {destName && (
              <span className="inline-block bg-[#FF6F4C] text-white text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
                ✈ {destName}
              </span>
            )}
            <h1
              className="font-black leading-[1.05] mb-4 text-white"
              style={{ fontSize: "clamp(32px, 6vw, 56px)" }}
            >
              {page.hero_headline}
            </h1>
            {page.hero_subtext && (
              <p className="text-lg sm:text-xl text-white/85 max-w-xl mb-7" style={{ fontWeight: 400 }}>
                {page.hero_subtext}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {page.stay_days && <TrustChip>🗓 {page.stay_days}</TrustChip>}
              {page.budget ? <TrustChip>💰 From {formatINR(page.budget)}</TrustChip> : null}
              <TrustChip>⭐ 4.8 Google Rating</TrustChip>
              <TrustChip>🏆 250+ Happy Families</TrustChip>
            </div>
          </div>
          <div id="enquire" className="md:col-span-2">
            <EnquiryForm page={page} variant="card" />
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 md:divide-x md:divide-gray-200 text-center">
          {[
            ["250+", "Happy Families"],
            ["4.8★", "Google Rating"],
            ["₹0", "Booking Fees"],
            ["₹0", "Hidden Charges"],
          ].map(([num, label]) => (
            <div key={label} className="px-2">
              <div className="font-black text-2xl text-[#1A1D2E]">{num}</div>
              <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* INCLUSIONS */}
      {inclusions.length > 0 && (
        <section className="bg-[#EEE5D5] py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-8 text-center">What's Included</h2>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {inclusions.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-[#1A1D2E]">
                  <Check className="h-5 w-5 text-[#056147] shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* DAYS */}
      {days.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-8 text-center">Day by Day Plan</h2>
            <div className="space-y-2">
              {days.map((d, i) => {
                const open = expandedDay === i;
                return (
                  <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDay(open ? null : i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-bold text-base">
                        Day {i + 1} — <span className="text-[#FF6F4C]">{d.title || d.day_title || "Itinerary"}</span>
                      </span>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {d.description || d.day_description || ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="bg-[#1A1D2E] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-8 text-center">Trip Highlights</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {gallery.slice(0, 9).map((src, i) => (
                <button
                  key={i}
                  onClick={() => setLightbox(src)}
                  className="aspect-[4/3] overflow-hidden rounded-xl group"
                >
                  <img
                    src={src}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-10 text-center">What Travellers Say</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {FALLBACK_TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
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

      {/* CTA BANNER */}
      <section className="bg-[#FF6F4C] py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-6">Ready to make this trip happen?</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={scrollToForm}
              className="h-12 px-6 bg-white text-[#FF6F4C] font-bold rounded-full hover:bg-white/90 transition-colors"
            >
              Get Free Quote
            </button>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 px-6 bg-[#25D366] text-white font-bold rounded-full hover:bg-[#1ebe58] transition-colors flex items-center"
            >
              💬 WhatsApp Now
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
      <MobileStickyBar />
      <div className="md:hidden h-14" />

      {/* LIGHTBOX */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-7 w-7" />
          </button>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full">
      {children}
    </span>
  );
}