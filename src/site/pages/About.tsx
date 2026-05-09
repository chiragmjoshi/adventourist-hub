import SiteLayout from "@/site/SiteLayout";
import { TimelineEntry } from "@/site/components/about/TimelineEntry";
import { Link } from "react-router-dom";
import { WHATSAPP_URL } from "@/site/lib/constants";

const timeline = [
  { year: "2019", title: "The Beginning", text: "Adventourist was born from a single belief — that travel should be designed around people, not packages." },
  { year: "2021", title: "100 Families Travelled", text: "Word of mouth carried us through the pandemic. We doubled down on personalisation and on-call support." },
  { year: "2023", title: "Going International", text: "Bali, Thailand, Sri Lanka, Singapore. Our international circuit became our biggest sweet spot." },
  { year: "2025", title: "250+ Families & Counting", text: "What started in Mumbai is now reaching travellers across India — same hands-on planning, bigger team." },
];

const team = [
  { name: "Minal Shah", role: "Founder & Lead Travel Designer", note: "Loves Bali, hates compromises on hotels." },
  { name: "Pinky Mehta", role: "Senior Travel Expert · Asia", note: "Knows Thailand the way locals know Thailand." },
  { name: "Rahul Desai", role: "Operations · Mountains & Adventure", note: "Has done Ladakh seven times. Counting." },
  { name: "Priya Nair", role: "Travel Designer · Honeymoons", note: "Believes good travel is half magic, half logistics." },
];

export default function About() {
  return (
    <SiteLayout
      title="About Adventourist | Travel Designed For You"
      description="A premium experiential travel company from Mumbai. We've planned trips for 250+ families across Bali, Ladakh, Thailand, Sri Lanka, Singapore and more."
    >
      {/* Hero */}
      <section className="bg-abyss topo-texture text-white py-20 lg:py-28">
        <style>{`.topo-texture::before { color: #ffffff; opacity: 0.06; }`}</style>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3 text-horizon">Our Story</p>
          <h1 className="font-display font-black text-4xl lg:text-6xl leading-tight">
            We don't sell trips.<br />
            <span className="text-horizon italic">We design them.</span>
          </h1>
          <p className="font-body text-lg text-white/70 mt-6 max-w-2xl mx-auto">
            Adventourist was started in Mumbai with a simple idea — travel planning should feel like a conversation with a friend who happens to know the world.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-3">Milestones</p>
          <h2 className="font-display font-black text-3xl lg:text-4xl text-abyss mb-12">A short journey, a long way to go.</h2>
          <div className="relative pl-8 border-l-2 border-blaze/20 space-y-12">
            {timeline.map((t) => (
              <TimelineEntry key={t.year}>
                <div className="relative">
                  <span className="absolute -left-[42px] top-1 w-4 h-4 rounded-full bg-blaze ring-4 ring-blaze/20" />
                  <p className="font-display font-black text-blaze text-xl">{t.year}</p>
                  <h3 className="font-display font-bold text-2xl text-abyss mt-1 mb-2">{t.title}</h3>
                  <p className="font-body text-ink/65 text-[15px] leading-[1.7]">{t.text}</p>
                </div>
              </TimelineEntry>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-16 lg:py-24 bg-drift">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-3">The Humans Behind The Trips</p>
          <h2 className="font-display font-black text-3xl lg:text-4xl text-abyss mb-12">Meet the team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((m) => (
              <div key={m.name} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-horizon flex items-center justify-center font-display font-bold text-abyss text-xl mb-4">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <h3 className="font-display font-bold text-lg text-abyss">{m.name}</h3>
                <p className="font-body text-xs text-blaze font-semibold uppercase tracking-wide mt-1">{m.role}</p>
                <p className="font-body text-sm text-ink/60 mt-2">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-white text-center px-4">
        <h2 className="font-display font-black text-3xl text-abyss mb-3">Want to plan a trip with us?</h2>
        <p className="font-body text-ink/60 mb-6">Free planning. Real experts. Mumbai-based, world-curious.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/trips" className="inline-flex items-center justify-center bg-blaze text-white font-display font-bold px-7 py-3 rounded-full hover:bg-blaze/90 transition-colors">Browse Trips</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center border-2 border-horizon text-abyss font-display font-bold px-7 py-3 rounded-full hover:bg-horizon transition-colors">💬 Talk to an Expert</a>
        </div>
      </section>
    </SiteLayout>
  );
}