import { useState } from "react";
import { Check, ChevronDown, Star, X } from "lucide-react";
import { formatINR } from "@/lib/formatINR";
import { LandingPageData, ItineraryData, FALLBACK_TESTIMONIALS, WHATSAPP_URL } from "../shared";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import MobileStickyBar from "../components/MobileStickyBar";
import EnquiryForm from "../components/EnquiryForm";

interface Props {
  page: LandingPageData;
  itinerary?: ItineraryData | null;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function BoldTemplate({ page, itinerary }: Props) {
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Cascade fallbacks across LP → itinerary → destination
  const dest = page.destinations || null;
  const destName = dest?.name || "";
  const heroImage = page.hero_image || itinerary?.hero_image || dest?.hero_image || null;
  const headline = page.hero_headline || itinerary?.headline || page.name || "";
  const subtext = page.hero_subtext || (itinerary?.about ? itinerary.about.slice(0, 180) : "") || (dest?.about ? dest.about.slice(0, 180) : "");
  const budget = page.budget || itinerary?.price_per_person || null;
  const stayDays = page.stay_days || (itinerary?.nights && itinerary?.days ? `${itinerary.nights} Nights & ${itinerary.days} Days` : null);
  const days = (itinerary?.itinerary_days as any[]) || [];
  const inclusionsText = page.custom_inclusions || itinerary?.inclusions || "";
  const exclusionsText = page.custom_exclusions || itinerary?.exclusions || "";
  const highlights: any[] = (itinerary?.highlights as any[]) || [];
  const gallery = (page.gallery && page.gallery.length ? page.gallery : itinerary?.gallery) || [];
  const flightsIncluded = !!itinerary?.flights_included;
  const stayIncluded = !!itinerary?.stay_included;
  const transfersIncluded = !!itinerary?.transfers_included;
  const mealsIncluded = !!itinerary?.meals_included;
  const breakfastIncluded = !!itinerary?.breakfast_included;
  const sightseeingIncluded = !!itinerary?.sightseeing_included;
  const support247 = !!itinerary?.support_247;
  const anyInclusionFlag = stayIncluded || breakfastIncluded || transfersIncluded || flightsIncluded || sightseeingIncluded || mealsIncluded || support247;
  const bestMonthsNums: number[] = (page.time_to_visit?.length ? (page.time_to_visit as any).map((m: any) => Number(m)).filter((n: number) => n >= 1 && n <= 12) : itinerary?.best_months || dest?.best_months || []) as number[];
  const bestMonths = bestMonthsNums.map((m) => MONTH_NAMES[m - 1]).filter(Boolean);
  const suitableFor = (page.suitable_for?.length ? page.suitable_for : itinerary?.suitable_for) || [];

  const scrollToForm = () => document.getElementById("enquire")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-white text-[#1A1D2E]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNavbar />

      {/* HERO */}
      <section
        className="relative min-h-[640px] md:min-h-[calc(100vh-56px)] flex items-center"
        style={
          heroImage
            ? { backgroundImage: `url(${heroImage})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#1A1D2E" }
        }
      >
        {!heroImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A1D2E] to-[#056147]" />
        )}
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
              {headline}
            </h1>
            {subtext && (
              <p className="text-lg sm:text-xl text-white/85 max-w-xl mb-7" style={{ fontWeight: 400 }}>
                {subtext}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {stayDays && <TrustChip>🗓 {stayDays}</TrustChip>}
              {budget ? <TrustChip>💰 From {formatINR(budget)}</TrustChip> : null}
              <TrustChip>⭐ 4.8 Google Rating</TrustChip>
              <TrustChip>🏆 250+ Happy Families</TrustChip>
            </div>
          </div>
          <div id="enquire" className="md:col-span-2">
            <EnquiryForm page={page} variant="card" />
          </div>
        </div>
      </section>

      {/* TRIP SUMMARY STRIP */}
      <section className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:divide-x md:divide-gray-200">
            {stayDays && (
              <SummaryStat icon="🗓" label="Duration" value={stayDays} />
            )}
            {budget && (
              <SummaryStat icon="💰" label="Starting from" value={`${formatINR(budget)} per person`} accent />
            )}
            {bestMonths.length > 0 && (
              <SummaryStat icon="☀️" label="Best time" value={`${bestMonths.slice(0, 3).join(", ")}${bestMonths.length > 3 ? "…" : ""}`} />
            )}
            {suitableFor.length > 0 && (
              <SummaryStat icon="👥" label="Perfect for" value={suitableFor.slice(0, 2).join(", ")} />
            )}
          </div>
        </div>
      </section>

      {/* PACKAGE INCLUSION ICONS */}
      {anyInclusionFlag && (
        <section className="bg-[#EEE5D5] py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-xs font-bold text-[#FF6F4C] uppercase tracking-widest mb-2 text-center">
              Package Inclusions
            </p>
            <h2 className="text-2xl font-black text-[#1A1D2E] text-center mb-8">
              Everything's Taken Care Of
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {stayIncluded && <InclusionCard icon="🏨" label="Hotel Stay" sub="Included" />}
              {breakfastIncluded && <InclusionCard icon="🍳" label="Breakfast" sub="Daily" />}
              {transfersIncluded && <InclusionCard icon="🚐" label="Transfers" sub="All included" />}
              {flightsIncluded && <InclusionCard icon="✈️" label="Flights" sub="Included" />}
              {sightseeingIncluded && <InclusionCard icon="🗺️" label="Sightseeing" sub="Guided" />}
              {mealsIncluded && <InclusionCard icon="🍽️" label="All Meals" sub="Included" />}
              {support247 && <InclusionCard icon="📞" label="24/7 Support" sub="Throughout trip" />}
              <InclusionCard icon="💰" label="Zero Booking Fee" sub="Always" />
            </div>
          </div>
        </section>
      )}

      {/* DAYS */}
      {days.length > 0 && (
        <section id="itinerary" className="bg-white py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <p className="text-xs font-bold text-[#FF6F4C] uppercase tracking-widest mb-2 text-center">Day by Day</p>
            <h2 className="text-3xl md:text-4xl font-black text-[#1A1D2E] mb-8 text-center">
              Your {itinerary?.days || days.length}-Day{destName ? ` ${destName}` : ""} Journey
            </h2>
            <div className="space-y-2">
              {days.map((d, i) => {
                const open = expandedDay === i;
                const desc = d.description || d.day_description || "";
                const meals = d.meals || {};
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
                      <div className="px-5 pb-5 border-t border-gray-100">
                        {desc && (
                          <div className="mt-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: desc }} />
                        )}
                        {(meals.breakfast || meals.lunch || meals.dinner) && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {meals.breakfast && <MealChip>🍳 Breakfast</MealChip>}
                            {meals.lunch && <MealChip>🍱 Lunch</MealChip>}
                            {meals.dinner && <MealChip>🍽️ Dinner</MealChip>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* INCLUSIONS / EXCLUSIONS TEXT */}
      {(inclusionsText || exclusionsText) && (
        <section id="inclusions" className="bg-[#F8F8F6] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <p className="text-xs font-bold text-[#FF6F4C] uppercase tracking-widest mb-2">Package Details</p>
            <h2 className="text-3xl font-black text-[#1A1D2E] mb-10">What's In &amp; What's Out</h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl">
              {inclusionsText && (
                <div className="bg-white rounded-2xl p-6 border border-green-100">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-bold">✓</span>
                    <h3 className="font-bold text-[#1A1D2E]">Inclusions</h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: inclusionsText }} />
                </div>
              )}
              {exclusionsText && (
                <div className="bg-white rounded-2xl p-6 border border-red-50">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-400 text-xs font-bold">✗</span>
                    <h3 className="font-bold text-[#1A1D2E]">Exclusions</h3>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: exclusionsText }} />
                </div>
              )}
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

function SummaryStat({ icon, label, value, accent }: { icon: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-4 first:pl-0">
      <span className="text-lg">{icon}</span>
      <div className="text-left">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
        <p className={`text-sm font-semibold ${accent ? "text-[#FF6F4C]" : "text-gray-800"}`}>{value}</p>
      </div>
    </div>
  );
}

function InclusionCard({ icon, label, sub }: { icon: string; label: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm font-semibold text-[#1A1D2E]">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function MealChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs bg-[#EEE5D5] text-[#1A1D2E] px-2 py-1 rounded-full">{children}</span>
  );
}