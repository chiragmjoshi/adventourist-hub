import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { WHATSAPP_URL, PHONE_DISPLAY } from "./shared";
import LandingNavbar from "./components/LandingNavbar";
import LandingFooter from "./components/LandingFooter";
import MobileStickyBar from "./components/MobileStickyBar";

export default function ThankYouPage() {
  const { slug } = useParams<{ slug: string }>();
  const [search] = useSearchParams();
  const name = search.get("name") || "";
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    document.title = "Thank you · Adventourist";
    (async () => {
      try {
        const { data } = await supabase
          .from("itineraries")
          .select("slug, headline, hero_image, price_per_person, destinations:destination_id(name)")
          .eq("status", "published")
          .limit(12);
        if (data?.length) {
          const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 3);
          setTrips(shuffled);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-white text-[#1A1D2E]" style={{ fontFamily: "Inter, sans-serif" }}>
      <LandingNavbar />

      {/* HERO */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-20 h-20 mx-auto bg-[#64CBB9] rounded-full flex items-center justify-center mb-7 animate-[pulse_2s_ease-in-out_infinite]">
            <Check className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4">
            You're all set{name ? `, ${name}` : ""}! 🎉
          </h1>
          <p className="text-lg text-gray-500">
            Your travel expert will call or WhatsApp you within 2 hours. Keep your phone handy!
          </p>
        </div>
      </section>

      {/* NEXT STEPS */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-5">
          {[
            ["📞", "Expect a call", "Within 2 hours, Mon–Sat 9am–9pm"],
            ["📋", "We'll plan for you", "Custom itinerary built around your dates and budget"],
            ["✈️", "Travel stress-free", "Zero booking fees, 24/7 trip support"],
          ].map(([icon, title, desc]) => (
            <div key={title} className="bg-[#EEE5D5]/40 border border-[#EEE5D5] rounded-2xl p-7 text-center">
              <div className="text-4xl mb-3">{icon}</div>
              <div className="font-bold text-base mb-2">{title}</div>
              <div className="text-sm text-gray-600 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* WHATSAPP CTA */}
      <section className="bg-[#1A1D2E] py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-6">
            Can't wait? Message us now
          </h2>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-14 px-8 bg-[#25D366] text-white font-bold rounded-full hover:bg-[#1ebe58] transition-colors items-center gap-2 text-base"
          >
            💬 Start WhatsApp Chat
          </a>
          <p className="text-white/60 text-sm mt-4">{PHONE_DISPLAY} · Mon–Sat, 9am–9pm IST</p>
        </div>
      </section>

      {/* EXPLORE MORE */}
      {trips.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl md:text-3xl font-black text-center mb-10">
              While you wait, explore more trips
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {trips.map((t) => (
                <a
                  key={t.slug}
                  href={`https://www.adventourist.in/trips/${t.slug}`}
                  className="group block bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
                >
                  {t.hero_image && (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={t.hero_image}
                        alt={t.headline}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="text-xs text-[#FF6F4C] uppercase tracking-wider font-bold mb-1">
                      {t.destinations?.name}
                    </div>
                    <div className="font-bold text-base mb-2 line-clamp-2">{t.headline}</div>
                    {t.price_per_person && (
                      <div className="text-sm text-gray-500">From {formatINR(t.price_per_person)}</div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <LandingFooter />
      <MobileStickyBar />
      <div className="md:hidden h-14" />
    </div>
  );
}