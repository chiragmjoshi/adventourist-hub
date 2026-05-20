import { Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import { waLink } from "@/site/lib/utils";
import { WHATSAPP_NUMBER_DISPLAY, PHONE_DISPLAY } from "@/site/lib/constants";

const SITE = "https://www.adventourist.in";

const SERVICES = [
  {
    title: "Custom Travel Planner",
    body: "Tell us your dates, group and budget — we build a one-of-one itinerary, no off-the-shelf packages.",
    href: "/trips",
  },
  {
    title: "Family Holiday Planner",
    body: "Kid-friendly stays, paced sightseeing, vegetarian options sorted, and a planner on WhatsApp through the trip.",
    href: "/trips",
  },
  {
    title: "Honeymoon Planner",
    body: "Private transfers, romantic stays, candle-lit dinners, surprise add-ons — Bali, Maldives, Seychelles, Europe.",
    href: "/trips",
  },
  {
    title: "International Trip Planner",
    body: "Visa guidance, forex, flight bundling, and ground handling for 30+ international destinations.",
    href: "/destinations",
  },
];

const FAQS = [
  {
    q: "Where is Adventourist based?",
    a: "We are a Mumbai-based travel planning company. Our office is in Mumbai and we plan trips for clients across Mumbai, Pune, Thane and the rest of India.",
  },
  {
    q: "Do you charge booking fees?",
    a: "No. Our planning service is free — you only pay for what we book on your behalf. There are no hidden agency fees.",
  },
  {
    q: "How is Adventourist different from MakeMyTrip or Yatra?",
    a: "Online portals sell fixed packages. We design custom trips around you — your dates, group, food preferences, pace and budget. You also get a dedicated planner over WhatsApp, before and during your trip.",
  },
  {
    q: "Do you handle international visas?",
    a: "Yes. We guide you on documentation, help with applications, and bundle visas into your trip cost for most countries we plan trips to.",
  },
  {
    q: "How do I start?",
    a: `Message us on WhatsApp at ${WHATSAPP_NUMBER_DISPLAY} or fill the enquiry form. A planner gets back within a few hours.`,
  },
];

export default function MumbaiAgency() {
  const url = `${SITE}/travel-agency-mumbai`;
  const schema: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: "Adventourist",
      url,
      image: `${SITE}/site-images/bg-home-page.jpg`,
      telephone: "+91-9930400694",
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Mumbai",
        addressRegion: "Maharashtra",
        addressCountry: "IN",
      },
      areaServed: ["Mumbai", "Pune", "Thane", "India"],
      sameAs: [
        "https://www.instagram.com/adventourist.in",
        "https://www.facebook.com/adventourist.in",
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "250",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: "Travel Agency in Mumbai", item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <SiteLayout>
      <SEO
        title="Travel Agency in Mumbai | Custom Trip Planner — Adventourist"
        description="Mumbai-based travel agency planning custom holidays, honeymoons and international trips. 4.8★ rated · zero booking fees · WhatsApp planner."
        canonical="/travel-agency-mumbai"
        keywords="travel agency mumbai, custom travel planner mumbai, honeymoon planner mumbai, family vacation planner mumbai, international tour planner mumbai"
        schema={schema}
      />

      <nav aria-label="Breadcrumb" className="bg-white border-b border-abyss/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-sm font-body text-ink/55">
          <Link to="/" className="hover:text-blaze">Home</Link>
          <span className="mx-2 text-ink/25">/</span>
          <span className="text-abyss font-semibold">Travel Agency in Mumbai</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-drift pt-10 pb-16 lg:pt-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-blaze font-display font-semibold tracking-[0.2em] text-xs uppercase mb-4">
              Mumbai · Since 2019
            </p>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-abyss leading-[1.05] mb-5">
              Mumbai's Custom <span className="text-blaze italic">Travel Planner</span> for Families, Couples & First-Timers
            </h1>
            <p className="font-body text-lg text-ink/70 mb-7 max-w-xl">
              Adventourist is a Mumbai-based travel planning company. We design personalised family holidays, honeymoons and international trips — zero booking fees, one planner on WhatsApp the whole way.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href={waLink("Hi! I'd like to plan a trip with Adventourist.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold px-6 py-3.5 rounded-full"
              >
                💬 WhatsApp Us
              </a>
              <a
                href={`tel:+919930400694`}
                className="inline-flex items-center gap-2 bg-white border border-abyss/15 hover:border-blaze text-abyss font-display font-bold px-6 py-3.5 rounded-full"
              >
                📞 Call {PHONE_DISPLAY}
              </a>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 mt-6 font-body text-sm text-ink/65">
              <li className="inline-flex items-center gap-1.5"><span className="text-horizon">★</span> 4.8 Google rated</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-blaze">✓</span> Zero booking fees</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-blaze">✓</span> 50+ destinations</li>
              <li className="inline-flex items-center gap-1.5"><span className="text-blaze">✓</span> Mumbai-based team</li>
            </ul>
          </div>
          <div className="aspect-[4/5] lg:aspect-[5/6] rounded-3xl overflow-hidden bg-abyss/10 shadow-xl">
            <img
              src="/site-images/bg-home-page.jpg"
              alt="Mumbai-based Adventourist travel team planning a trip"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="bg-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-3xl lg:text-4xl text-abyss mb-3">What we plan</h2>
          <p className="font-body text-ink/65 max-w-2xl mb-10">
            From short India breaks to multi-country international trips — every plan is built from scratch around you.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {SERVICES.map((s) => (
              <Link
                key={s.title}
                to={s.href}
                className="group bg-drift/40 hover:bg-drift rounded-2xl p-6 border border-abyss/5 hover:border-blaze/30 transition-all"
              >
                <h3 className="font-display font-bold text-lg text-abyss mb-2 group-hover:text-blaze transition-colors">{s.title}</h3>
                <p className="font-body text-sm text-ink/70 leading-relaxed">{s.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-drift/40 py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="font-display font-black text-3xl lg:text-4xl text-abyss mb-5">
              Why Mumbai families choose Adventourist
            </h2>
            <ul className="space-y-4 font-body text-ink/75 text-[16px] leading-[1.7]">
              <li><strong className="text-abyss font-display">No off-the-shelf packages.</strong> Every itinerary is built from scratch around your dates, group, food and pace.</li>
              <li><strong className="text-abyss font-display">One planner end-to-end.</strong> You're not bounced around a call centre — one Mumbai-based planner handles your trip from enquiry to return.</li>
              <li><strong className="text-abyss font-display">Zero booking fees.</strong> Our planning service is free. You only pay for what we book for you.</li>
              <li><strong className="text-abyss font-started">Local-on-ground partners.</strong> Vetted hotels, drivers and guides in every destination — not just GDS bookings.</li>
              <li><strong className="text-abyss font-display">WhatsApp support during travel.</strong> If something changes mid-trip, your planner is one message away.</li>
            </ul>
          </div>
          <aside className="bg-abyss text-white rounded-3xl p-8 self-start">
            <h3 className="font-display font-bold text-xl mb-3">Find us in Mumbai</h3>
            <p className="font-body text-white/75 mb-5 text-sm leading-relaxed">
              We're a small team based in Mumbai, Maharashtra. Open Monday–Saturday, 10am–7pm IST.
            </p>
            <dl className="space-y-3 font-body text-sm">
              <div>
                <dt className="text-white/55 text-xs uppercase tracking-wide mb-0.5">Phone</dt>
                <dd><a href="tel:+919930400694" className="text-white hover:text-horizon">{PHONE_DISPLAY}</a></dd>
              </div>
              <div>
                <dt className="text-white/55 text-xs uppercase tracking-wide mb-0.5">WhatsApp</dt>
                <dd><a href={waLink("Hi! I'd like to plan a trip.")} target="_blank" rel="noreferrer" className="text-white hover:text-horizon">{WHATSAPP_NUMBER_DISPLAY}</a></dd>
              </div>
              <div>
                <dt className="text-white/55 text-xs uppercase tracking-wide mb-0.5">Email</dt>
                <dd><a href="mailto:hello@adventourist.in" className="text-white hover:text-horizon">hello@adventourist.in</a></dd>
              </div>
              <div>
                <dt className="text-white/55 text-xs uppercase tracking-wide mb-0.5">Location</dt>
                <dd>Mumbai, Maharashtra, India</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-white py-14 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display font-black text-3xl lg:text-4xl text-abyss mb-8">
            Frequently asked questions
          </h2>
          <dl className="space-y-4">
            {FAQS.map((f) => (
              <div key={f.q} className="border border-abyss/10 rounded-2xl p-5 lg:p-6">
                <dt className="font-display font-bold text-abyss mb-2">{f.q}</dt>
                <dd className="font-body text-ink/70 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-abyss text-white py-14 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display font-black text-3xl lg:text-5xl mb-4">
            Ready to start planning?
          </h2>
          <p className="font-body text-white/75 text-lg mb-7 max-w-2xl mx-auto">
            Tell us where you want to go, when and with whom. A Mumbai-based planner will get back to you within a few hours.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={waLink("Hi! I'd like to plan a trip with Adventourist.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold px-6 py-3.5 rounded-full"
            >
              💬 WhatsApp Us
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-display font-bold px-6 py-3.5 rounded-full"
            >
              Send an enquiry
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}