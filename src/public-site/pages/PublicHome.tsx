import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import DestinationCard from "../components/DestinationCard";
import ItineraryCard from "../components/ItineraryCard";
import EnquiryForm from "../components/EnquiryForm";
import { api, type Destination, type ItinerarySummary } from "../lib/api";

const PublicHome = ({ basePath = "/preview" }: { basePath?: string }) => {
  const [dests, setDests] = useState<Destination[]>([]);
  const [itins, setItins] = useState<ItinerarySummary[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);

  useEffect(() => {
    api.destinations().then(setDests).catch(() => {});
    api.itineraries().then((d) => setItins(d.slice(0, 6))).catch(() => {});
    api.testimonials().then((d) => setTestimonials(d.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicNav basePath={basePath} />

      {/* HERO */}
      <section className="relative min-h-[600px] flex items-center" style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--abyss)) 0%, hsl(var(--ridge)) 100%)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-[1fr_400px] gap-12 items-center w-full">
          <div className="text-primary-foreground">
            <span className="inline-block bg-primary-foreground/10 text-primary-foreground/90 text-xs font-medium px-3 py-1 rounded-full mb-5 backdrop-blur-sm">Curated Travel Experiences</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">Journeys designed around <span className="text-secondary">you</span>.</h1>
            <p className="text-lg opacity-80 mb-8 max-w-xl">From snow-dusted Ladakh to Bali's hidden waterfalls, we craft trips that feel like yours from the first day.</p>
            <div className="flex flex-wrap gap-3">
              <Link to={`${basePath}/destinations`} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors">Explore Destinations</Link>
              <Link to={`${basePath}/itineraries`} className="px-6 py-3 border-2 border-primary-foreground/40 text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary-foreground/10 transition-colors">Browse Itineraries</Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <EnquiryForm title="Plan My Trip" subtitle="Free consultation. Zero obligation." source="home_hero" />
          </div>
        </div>
      </section>

      {/* DESTINATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Where we go</p>
            <h2 className="text-3xl sm:text-4xl font-bold">Featured Destinations</h2>
          </div>
          <Link to={`${basePath}/destinations`} className="hidden sm:block text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {dests.slice(0, 6).map((d) => <DestinationCard key={d.id} d={d} basePath={basePath} />)}
        </div>
      </section>

      {/* ITINERARIES */}
      <section className="bg-muted py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Pre-built journeys</p>
              <h2 className="text-3xl sm:text-4xl font-bold">Popular Itineraries</h2>
            </div>
            <Link to={`${basePath}/itineraries`} className="hidden sm:block text-sm font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {itins.map((it) => <ItineraryCard key={it.id} it={it} basePath={basePath} />)}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="bg-ridge text-primary-foreground py-20" style={{ background: "hsl(var(--ridge))" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-primary-foreground/60 uppercase tracking-widest mb-2 text-center">Why Adventourist</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Travel as it should be</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "🧭", title: "Expert-Led Planning", desc: "Itineraries by people who've been there." },
              { emoji: "🤝", title: "Hassle-Free", desc: "Bookings, transfers, support — handled." },
              { emoji: "🌍", title: "Local Connections", desc: "Authentic guides, hidden gems, real stories." },
              { emoji: "💬", title: "24/7 Support", desc: "A real human, anytime, anywhere." },
            ].map(c => (
              <div key={c.title} className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-6 text-center">
                <span className="text-3xl mb-3 block">{c.emoji}</span>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2 text-center">From our travellers</p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-12 text-center">Stories that travel with you</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6">
                <p className="text-sm text-card-foreground leading-relaxed">"{t.quote}"</p>
                <p className="mt-4 text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.destination}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <PublicFooter />
    </div>
  );
};

export default PublicHome;