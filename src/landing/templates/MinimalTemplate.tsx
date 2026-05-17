import { useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { formatINR } from "@/lib/formatINR";
import { LandingPageData, ItineraryData, FALLBACK_TESTIMONIALS } from "../shared";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import MobileStickyBar from "../components/MobileStickyBar";
import EnquiryForm from "../components/EnquiryForm";

interface Props {
  page: LandingPageData;
  itinerary?: ItineraryData | null;
}

export default function MinimalTemplate({ page, itinerary }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const destName = page.destinations?.name || "";
  const days = (itinerary?.itinerary_days as any[]) || [];

  const scrollToForm = () => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-[#1A1D2E]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNavbar />

      {/* HERO */}
      <section className="grid md:grid-cols-[55fr_45fr] min-h-[600px]">
        <div className="flex items-center px-6 md:px-16 py-14 bg-white">
          <div className="max-w-lg">
            {destName && (
              <span className="inline-block bg-[#1A1D2E]/10 text-[#1A1D2E] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
                {destName}
              </span>
            )}
            <h1
              className="font-black text-[#1A1D2E] leading-[0.95] mb-5"
              style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
            >
              {page.hero_headline}
            </h1>
            {page.hero_subtext && (
              <p className="text-lg text-[#666] max-w-md mb-6 leading-relaxed">{page.hero_subtext}</p>
            )}
            <div className="space-y-2 mb-7">
              {page.budget ? (
                <div className="inline-block bg-[#1A1D2E] text-white px-4 py-1.5 rounded-full text-sm font-semibold">
                  From {formatINR(page.budget)} per person
                </div>
              ) : null}
              {page.stay_days && (
                <div className="text-sm text-gray-500">{page.stay_days}</div>
              )}
            </div>
            <button
              onClick={scrollToForm}
              className="h-12 px-7 bg-[#FF6F4C] hover:bg-[#e5603f] text-white font-bold rounded-full transition-colors"
            >
              Plan This Trip →
            </button>
          </div>
        </div>
        <div
          className="min-h-[300px] md:min-h-full md:rounded-l-[2rem]"
          style={
            page.hero_image
              ? { backgroundImage: `url(${page.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { backgroundColor: "#1A1D2E" }
          }
        />
      </section>

      {/* FORM SECTION */}
      <section id="enquire" className="bg-[#F8F8F6] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-[40fr_60fr] gap-10 items-start">
          <div>
            <h2 className="text-3xl font-black text-[#1A1D2E] mb-7">Why Adventourist?</h2>
            <ul className="space-y-5 text-sm text-gray-700">
              {[
                ["🏆", "Expert-planned, zero fuss"],
                ["📞", "24/7 WhatsApp support"],
                ["💰", "Zero booking fees"],
                ["⭐", "4.8 Google Rating"],
              ].map(([icon, text]) => (
                <li key={text} className="flex items-start gap-3">
                  <span className="text-xl">{icon}</span>
                  <span className="pt-0.5">{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <EnquiryForm page={page} variant="flat" buttonLabel="Request Free Itinerary →" />
        </div>
      </section>

      {/* DAYS */}
      {days.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-8 text-center">Day by Day</h2>
            <div className="space-y-2">
              {days.map((d, i) => {
                const open = expandedDay === i;
                return (
                  <div key={i} className="border-b border-gray-200 last:border-0">
                    <button
                      onClick={() => setExpandedDay(open ? null : i)}
                      className="w-full flex items-center justify-between py-5 text-left"
                    >
                      <span className="font-bold text-base">
                        Day {i + 1} <span className="text-gray-400 mx-2">—</span>
                        <span className="font-normal text-gray-700">{d.title || d.day_title}</span>
                      </span>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open && (
                      <div className="pb-5 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
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

      {/* TESTIMONIALS */}
      <section className="bg-[#F8F8F6] py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-10 text-center">Travellers Say</h2>
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
            {FALLBACK_TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="bg-white rounded-2xl p-7 min-w-[80%] sm:min-w-[60%] md:min-w-0 snap-start shadow-sm"
              >
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
    </div>
  );
}