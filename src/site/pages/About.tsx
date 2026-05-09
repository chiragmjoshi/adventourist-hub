import { useMemo } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import { TimelineEntry } from "@/site/components/about/TimelineEntry";
import { WHATSAPP_URL, WHATSAPP_NUMBER } from "@/site/lib/constants";

const milestones = [
  {
    year: "2018",
    accent: "blaze",
    body:
      "It all began with a road trip to Bhutan. We returned inspired and started building a platform to share authentic itineraries. Then a friend asked, “But who will book this for us?” — and in that moment, the idea for something bigger took shape.",
  },
  {
    year: "2019",
    accent: "blaze",
    body: "**Adventourist was born.**",
  },
  {
    year: "2019",
    accent: "blaze",
    body:
      "**We started with our personal favourite, Ladakh.** And boom — it took off. Our authentic advice, carefully crafted itineraries, and warm personalised approach brought in more and more travellers.",
  },
  {
    year: "2024",
    accent: "blaze",
    body: "We survived Covid and restarted when travel resumed — and did record sales.",
  },
  {
    year: "Present",
    accent: "lagoon",
    body:
      "Today, we are a growing team of travel consultants and local experts, continuing to create seamless travel experiences. We aren't just trip planners — we are your trusted travel partners, just like your family doctor or financial advisor.",
  },
] as const;

const coreValues = [
  { icon: "🧗", title: "Adventure", body: "We seek experiences that stretch comfort zones and create stories worth telling." },
  { icon: "🔭", title: "Exploration", body: "Every journey opens a new lens on culture, nature, and ourselves." },
  { icon: "🌿", title: "Sustainability", body: "Responsible travel that gives back to the places and communities we visit." },
  { icon: "🎯", title: "Authenticity", body: "Genuine local connections over tourist traps — always." },
] as const;

const symbols = [
  { emoji: "🌅", tone: "bg-blaze/15", title: "Hope", body: "The sunrise that starts every great adventure." },
  { emoji: "⛰️", tone: "bg-lagoon/20", title: "Strength", body: "Every summit tells a story of courage and perseverance." },
  { emoji: "🌊", tone: "bg-lagoon/20", title: "Freedom", body: "The ocean that reminds us the world has no edges." },
  { emoji: "❤️", tone: "bg-horizon/30", title: "Love", body: "The feeling you carry home long after the trip ends." },
] as const;

const pillars = [
  { title: "Thrill meets Expertise", body: "We combine adrenaline-first itineraries with deep local knowledge so every adventure lands perfectly." },
  { title: "Bespoke, not boxed", body: "No copy-paste packages. Every itinerary starts from scratch around your preferences, timing, and budget." },
  { title: "Transparent, always", body: "What you see is what you pay. No hidden fees, no upsells — just a fair price for an exceptional trip." },
] as const;

const team = [
  { name: "Minal Joshi", role: "Travel Expert & Co-Founder", initials: "MJ" },
  { name: "Pinky Prajapati", role: "Travel Consultant", initials: "PP" },
  { name: "Mukund Joshi", role: "Operations & Logistics", initials: "MJ" },
  { name: "Viya Joshi", role: "Travel Curation Specialist", initials: "VJ" },
] as const;

const stats = [
  { icon: "👥", value: "250+", label: "Happy Clients" },
  { icon: "⭐", value: "4.8★", label: "Google Rating" },
  { icon: "🏝️", value: "50+", label: "Destinations" },
  { icon: "₹0", value: "₹0", label: "Extra Booking Fees", isPlain: true },
] as const;

export default function About() {
  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "AboutPage",
          name: "About Adventourist",
          url: "https://adventourist.in/about",
          description:
            "Adventourist is a Mumbai-based experiential travel company designing bespoke trips for 250+ families across Bali, Ladakh, Thailand, Sri Lanka, Singapore and beyond.",
          isPartOf: { "@type": "WebSite", name: "Adventourist", url: "https://adventourist.in" },
        },
        {
          "@type": "Organization",
          name: "Adventourist",
          url: "https://adventourist.in",
          logo: "https://adventourist.in/logo/logo-square-color.svg",
          foundingDate: "2019",
          founders: [{ "@type": "Person", name: "Minal Joshi" }],
          address: {
            "@type": "PostalAddress",
            streetAddress: "1 Madhav Kunj, South Pond Road, Vile Parle",
            addressLocality: "Mumbai",
            addressRegion: "Maharashtra",
            postalCode: "400056",
            addressCountry: "IN",
          },
          contactPoint: [{
            "@type": "ContactPoint",
            telephone: `+${WHATSAPP_NUMBER}`,
            contactType: "customer support",
            areaServed: "IN",
            availableLanguage: ["English", "Hindi"],
          }],
          sameAs: [
            "https://www.instagram.com/adventourist.in",
            "https://www.facebook.com/adventourist.in",
            "https://www.linkedin.com/company/adventourist",
          ],
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "250" },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://adventourist.in/" },
            { "@type": "ListItem", position: 2, name: "About", item: "https://adventourist.in/about" },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <SiteLayout
      title="About Adventourist | Travel Designed Around You, Not Sold From a Shelf"
      description="Mumbai-born experiential travel company. 250+ families, 50+ destinations, 4.8★ on Google. Meet the team and the values behind every Adventourist trip."
      keywords="about adventourist, travel company mumbai, experiential travel india, bespoke itineraries, travel designers"
      jsonLd={jsonLd}
    >
      {/* ---------- Hero ---------- */}
      <section className="bg-drift">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 lg:pt-12 lg:pb-28">
          <nav className="font-body text-[13px] text-ink/60 mb-8" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-blaze">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-abyss font-medium">About Us</span>
          </nav>
          <div className="text-center max-w-4xl mx-auto">
            <p className="font-display text-[12px] font-bold tracking-[0.22em] uppercase text-blaze mb-5">Our Story</p>
            <h1 className="font-display font-black text-abyss leading-[0.98] tracking-tight text-5xl sm:text-6xl lg:text-[88px]">
              We don't sell trips.
              <span className="block italic font-black text-blaze mt-2">We design journeys.</span>
            </h1>
            <p className="font-body text-[17px] sm:text-[18px] text-ink/65 leading-[1.7] max-w-2xl mx-auto mt-7">
              Born in Mumbai. Rooted in curiosity. Adventourist was built by travellers who got tired of cookie-cutter itineraries and decided to do it differently.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Mission / Vision ---------- */}
      <section className="bg-blaze">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid md:grid-cols-2 gap-10 lg:gap-16">
          <div>
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-horizon mb-4">Our Mission</p>
            <h2 className="font-display font-black text-white text-3xl sm:text-4xl lg:text-[42px] leading-[1.1] mb-5">
              To make extraordinary travel accessible to every curious soul.
            </h2>
            <p className="font-body text-white/85 text-[15.5px] leading-[1.75]">
              We believe the best journeys aren't sold off a shelf. They're crafted through conversation, shaped by your passions, and brought to life by experts who have stood where you want to stand. Our mission is simple: remove the friction from great travel.
            </p>
          </div>
          <div>
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-horizon mb-4">Our Vision</p>
            <h2 className="font-display font-black text-white text-3xl sm:text-4xl lg:text-[42px] leading-[1.1] mb-5">
              A world where travel is a conversation, not a transaction.
            </h2>
            <p className="font-body text-white/85 text-[15.5px] leading-[1.75]">
              We're building India's most trusted experiential travel brand — one where every interaction is human, every itinerary is thoughtful, and every rupee you spend earns a memory that outlasts the trip itself.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- How It All Started (Timeline) ---------- */}
      <section className="bg-white py-20 lg:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="font-display font-black text-abyss text-4xl sm:text-5xl leading-tight mb-3">How It All Started</h2>
            <p className="font-body text-[16px] text-ink/60">From a road trip to Bhutan, to planning trips for explorers everywhere.</p>
          </div>
          <ol className="relative">
            {/* vertical line */}
            <span aria-hidden className="absolute left-[120px] sm:left-[140px] top-2 bottom-2 w-px bg-lagoon/40" />
            <div className="space-y-12">
              {milestones.map((m, i) => (
                <TimelineEntry key={`${m.year}-${i}`}>
                  <li className="grid grid-cols-[120px_24px_1fr] sm:grid-cols-[140px_24px_1fr] items-start gap-x-3 sm:gap-x-5">
                    <div className={`font-display font-black text-2xl sm:text-3xl text-right pt-0.5 ${m.accent === "lagoon" ? "text-lagoon" : "text-blaze"}`}>
                      {m.year}
                    </div>
                    <div className="flex justify-center pt-2">
                      <span className={`block w-3 h-3 rounded-full ring-4 ring-white relative z-10 ${m.accent === "lagoon" ? "bg-lagoon" : "bg-blaze"}`} />
                    </div>
                    <p
                      className="font-body text-ink/75 text-[15.5px] leading-[1.75] pt-0.5"
                      dangerouslySetInnerHTML={{
                        __html: m.body
                          .replace(/&/g, "&amp;").replace(/</g, "&lt;")
                          .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-abyss">$1</strong>'),
                      }}
                    />
                  </li>
                </TimelineEntry>
              ))}
            </div>
          </ol>
        </div>
      </section>

      {/* ---------- Core Values ---------- */}
      <section className="bg-white py-16 lg:py-24 border-t border-ink/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-blaze mb-3">What We Stand For</p>
            <h2 className="font-display font-black text-abyss text-4xl sm:text-5xl leading-tight">
              Our <span className="italic text-blaze">Core Values</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {coreValues.map((v) => (
              <article
                key={v.title}
                className="bg-horizon rounded-2xl p-6 lg:p-7 border-2 border-dashed border-blaze/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-3xl mb-5" aria-hidden>{v.icon}</div>
                <h3 className="font-display font-black text-abyss text-2xl mb-3">{v.title}</h3>
                <p className="font-body text-abyss/75 text-[14.5px] leading-[1.65]">{v.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Four Symbols ---------- */}
      <section className="bg-drift py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,360px)_1fr] gap-10 lg:gap-16 items-center">
          <div className="flex justify-center lg:justify-start">
            <div className="bg-white rounded-3xl shadow-md p-10 w-[280px] sm:w-[320px]">
              <img
                src="/logo/logo-square-color.svg"
                alt="Adventourist mark — sunrise, summit, ocean and heart"
                className="w-full h-auto"
                width={300}
                height={300}
                loading="lazy"
              />
            </div>
          </div>
          <div>
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-blaze mb-3">Our Mark</p>
            <h2 className="font-display font-black text-abyss text-4xl sm:text-5xl leading-tight mb-4">Four Symbols. One Promise.</h2>
            <p className="font-body text-ink/65 text-[16px] leading-[1.7] mb-8 max-w-xl">
              Every element of our logo carries meaning — drawn from the places we love and the values we live by.
            </p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-6">
              {symbols.map((s) => (
                <div key={s.title} className="flex gap-4">
                  <div className={`w-11 h-11 rounded-xl ${s.tone} flex items-center justify-center text-xl flex-shrink-0`} aria-hidden>
                    {s.emoji}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-abyss text-[17px] mb-1">{s.title}</h3>
                    <p className="font-body text-ink/65 text-[14px] leading-[1.6]">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Built Different ---------- */}
      <section className="bg-blaze py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-horizon mb-3">Why Adventourist</p>
            <h2 className="font-display font-black text-white text-4xl sm:text-5xl leading-tight">
              Built different. <span className="italic">By design.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 lg:gap-12 text-center">
            {pillars.map((p) => (
              <div key={p.title}>
                <h3 className="font-display font-black text-white text-2xl sm:text-[26px] leading-tight mb-4">{p.title}</h3>
                <p className="font-body text-white/85 text-[15px] leading-[1.7] max-w-[300px] mx-auto">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Team ---------- */}
      <section id="team" className="bg-drift py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="font-display text-[11px] font-bold tracking-[0.22em] uppercase text-blaze mb-3">The People Behind The Trips</p>
            <h2 className="font-display font-black text-abyss text-4xl sm:text-5xl leading-tight">
              The People Behind <span className="italic text-blaze">Your Journey</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {team.map((m) => (
              <div key={m.name} className="text-center">
                <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-full bg-gradient-to-br from-horizon to-blaze ring-4 ring-white shadow-md flex items-center justify-center mb-4">
                  <span className="font-display font-black text-white text-3xl">{m.initials}</span>
                </div>
                <h3 className="font-display font-bold text-abyss text-[18px]">{m.name}</h3>
                <p className="font-body text-blaze text-[13.5px] mt-1">{m.role}</p>
              </div>
            ))}
          </div>
          <p className="font-body text-center text-ink/65 text-[15.5px] leading-[1.75] max-w-2xl mx-auto mt-12">
            And a growing team of travel consultants, local guides, and destination experts who make every trip feel like it was planned by a friend.
          </p>
        </div>
      </section>

      {/* ---------- Stats Strip ---------- */}
      <section className="bg-abyss py-14 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl mb-2" aria-hidden>{s.icon !== s.value ? s.icon : null}</div>
              <div className="font-display font-black text-white text-4xl sm:text-5xl tabular-nums">{s.value}</div>
              <div className="font-body text-white/55 text-[13px] mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="bg-blaze">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
          <p className="text-3xl mb-5" aria-hidden>⛺ 🧭 🔥</p>
          <h2 className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-3">
            250+ families planned their trip <span className="italic">exactly this way.</span>
          </h2>
          <p className="font-body text-white/85 text-[16px] mb-2">One conversation. A real expert. Your trip, planned around you.</p>
          <p className="font-body text-white/65 text-[13px] mb-8">Responds within 2 hrs · Mon–Sat, 9am–9pm IST · No spam, no pressure.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${WHATSAPP_URL}%20%5Bsrc%3Aabout_cta%5D`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-abyss text-white font-display font-bold px-8 py-4 rounded-full hover:bg-abyss/90 transition-colors text-[15px]"
            >
              <span aria-hidden>💬</span> Plan My Trip on WhatsApp
            </a>
            <Link
              to="/trips"
              className="inline-flex items-center justify-center bg-white text-abyss font-display font-bold px-8 py-4 rounded-full hover:bg-white/90 transition-colors text-[15px]"
            >
              Browse Itineraries →
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
