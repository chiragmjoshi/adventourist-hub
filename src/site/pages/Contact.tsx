import { useState } from "react";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import ContactForm from "@/site/components/contact/ContactForm";
import { PHONE_DISPLAY, SUPPORT_EMAIL, WHATSAPP_NUMBER } from "@/site/lib/constants";
import { waLink } from "@/site/lib/utils";
import { useLeadCapture } from "@/site/hooks/useLeadCapture";
import minalImg from "@/assets/team-minal.jpg";
import pinkyImg from "@/assets/team-pinky.jpg";
import viyaImg from "@/assets/team-viya.jpg";

const TEAM = [
  {
    name: "Minal Joshi",
    role: "Co-Founder & Lead Travel Expert",
    image: minalImg,
    waSource: "contact_team_minal",
  },
  {
    name: "Pinky Prajapati",
    role: "Travel Expert",
    image: pinkyImg,
    waSource: "contact_team_pinky",
  },
  {
    name: "Travel Team",
    role: "Destination Specialists",
    image: viyaImg,
    waSource: "contact_team_general",
  },
];

const STATS = [
  { icon: "🗓️", value: "Since 2018", label: "Crafting Journeys" },
  { icon: "⭐", value: "4.8★", label: "Google Rating" },
  { icon: "📍", value: "Mumbai", label: "Based In" },
  { icon: "🎯", value: "₹0", label: "Extra Booking Fees" },
];

const FAQS = [
  { q: "How quickly will I hear back after submitting?", a: "We respond to every enquiry within 2 business hours, Mon–Sat 9AM–9PM IST. You'll always speak to a real travel expert — never a bot or a script." },
  { q: "Do you charge a planning or consultation fee?", a: "No. Planning and consultation are completely free. You only pay when you're ready to book your trip." },
  { q: "Can I customise an existing itinerary?", a: "Absolutely. Every itinerary on our site is a starting point. We tailor every trip to your dates, group, budget and travel style." },
  { q: "Do you handle international trips from India?", a: "Yes — international trips are our specialty. We curate experiences in Bali, Thailand, Sri Lanka, Singapore, Vietnam, Seychelles and more, all from our Mumbai office." },
  { q: "How do payments and refunds work?", a: "We accept UPI, NEFT, cards and EMI. A booking deposit secures your trip, with the balance due before travel. Refunds follow our published cancellation policy and supplier terms." },
];

const ADDRESS = "1, Madhav Kunj, South Pond Road, Vile Parle, Mumbai – 400056";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=" +
  encodeURIComponent("Adventourist, 1 Madhav Kunj, South Pond Road, Vile Parle, Mumbai 400056");
const MAP_EMBED_URL =
  "https://www.google.com/maps?q=" +
  encodeURIComponent("1 Madhav Kunj, South Pond Road, Vile Parle, Mumbai 400056") +
  "&output=embed";

export default function Contact() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mapLoaded, setMapLoaded] = useState(false);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: "Contact Adventourist",
      url: "https://adventourist.in/contact",
      description: "Talk to a real travel expert. Replies within 2 hours, Mon–Sat 9AM–9PM IST.",
    },
    {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      name: "Adventourist",
      image: "https://adventourist.in/site-images/adventourist-horizontal.svg",
      url: "https://adventourist.in",
      telephone: "+91-9930400694",
      email: SUPPORT_EMAIL,
      priceRange: "₹₹",
      address: {
        "@type": "PostalAddress",
        streetAddress: "1, Madhav Kunj, South Pond Road, Vile Parle",
        addressLocality: "Mumbai",
        addressRegion: "Maharashtra",
        postalCode: "400056",
        addressCountry: "IN",
      },
      geo: { "@type": "GeoCoordinates", latitude: 19.1075, longitude: 72.838 },
      openingHoursSpecification: [{
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        opens: "09:00", closes: "21:00",
      }],
      sameAs: [
        "https://www.instagram.com/adventourist",
        "https://www.facebook.com/adventourist",
      ],
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "250" },
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
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://adventourist.in/" },
        { "@type": "ListItem", position: 2, name: "Contact Us", item: "https://adventourist.in/contact" },
      ],
    },
  ];

  return (
    <SiteLayout
      title="Contact Adventourist | Talk to a Real Travel Expert in 2 Hours"
      description="Plan your next trip with Adventourist's Mumbai-based travel experts. Reply within 2 hours, Mon–Sat. Call, WhatsApp or email — zero booking fees, zero pressure."
      keywords="contact adventourist, travel agency mumbai, plan trip whatsapp, bali ladakh thailand experts"
      jsonLd={jsonLd}
    >
      <SEO
        title="Contact Us — Plan Your Trip with Adventourist"
        description="Ready to travel? Contact Adventourist in Mumbai to plan your custom itinerary. WhatsApp, call, or email us — we respond within 24 hours."
        canonical="/contact"
        schema={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: "https://www.adventourist.in/contact",
          name: "Contact Adventourist",
          description: "Get in touch with Adventourist to plan your custom travel experience. Call, WhatsApp, or fill the form — we respond within 24 hours.",
          mainEntity: {
            "@type": "TravelAgency",
            "@id": "https://www.adventourist.in/#organization",
            name: "Adventourist",
            telephone: "+919930400694",
            email: "support@adventourist.in",
          },
        }}
      />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="bg-drift">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 text-sm font-body text-ink/60">
          <a href="/" className="hover:text-blaze">Home</a>
          <span className="mx-2 text-ink/30">/</span>
          <span className="text-abyss font-semibold">Contact Us</span>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-drift py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-blaze font-display font-semibold tracking-[0.2em] text-xs uppercase mb-4">
            Get In Touch
          </p>
          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-abyss leading-[1.1]">
            Let's Plan Your{" "}
            <span className="text-blaze italic font-black">Trip Together</span>
          </h1>
          <p className="font-body text-lg text-ink/60 mt-5 max-w-xl mx-auto">
            Real humans. Real expertise. Zero runaround.
          </p>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-abyss text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex items-center gap-3 justify-center md:justify-start">
              <span className="text-2xl" aria-hidden="true">{s.icon}</span>
              <div>
                <p className="font-display font-bold text-xl leading-tight">{s.value}</p>
                <p className="font-body text-xs text-white/60">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Form + team / office */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-10 lg:gap-14">
          {/* LEFT — Team + Office */}
          <div className="space-y-10">
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">Meet the Team</h2>
              <ul className="space-y-3">
                {TEAM.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-3 bg-drift rounded-2xl p-3 sm:p-4 hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-abyss flex-shrink-0 overflow-hidden flex items-center justify-center text-white">
                        {m.image ? (
                          <img src={m.image} alt={`${m.name} — ${m.role}`} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z M8 10a4 4 0 108 0M8 16c1.5-1 6.5-1 8 0" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-abyss truncate">{m.name}</p>
                        <p className="font-body text-sm text-ink/60 truncate">{m.role}</p>
                      </div>
                    </div>
                    <a
                      href={waLink({ source: m.waSource, message: `Hi ${m.name.split(" ")[0]}! I'd like help planning a trip.` })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe58] text-white font-display font-semibold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full transition-colors flex-shrink-0"
                      aria-label={`WhatsApp ${m.name}`}
                    >
                      WhatsApp
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Office Details */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-5">Office Details</h2>
              <dl className="space-y-5 font-body text-sm">
                <div className="flex gap-3">
                  <span aria-hidden="true" className="text-blaze">📍</span>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink/50 font-semibold mb-1">Address</dt>
                    <dd className="text-abyss leading-relaxed">{ADDRESS}</dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true" className="text-blaze">✉️</span>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink/50 font-semibold mb-1">Email</dt>
                    <dd><a href={`mailto:${SUPPORT_EMAIL}`} className="text-blaze hover:underline">{SUPPORT_EMAIL}</a></dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true" className="text-blaze">📞</span>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink/50 font-semibold mb-1">Phone</dt>
                    <dd><a href={`tel:+91${WHATSAPP_NUMBER.slice(2)}`} className="text-blaze hover:underline">{PHONE_DISPLAY}</a></dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span aria-hidden="true" className="text-blaze">⏰</span>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink/50 font-semibold mb-1">Hours</dt>
                    <dd className="text-abyss">Mon–Sat, 9:00 AM – 9:00 PM IST</dd>
                  </div>
                </div>
              </dl>
            </div>

            {/* Response Promise */}
            <div className="bg-blaze text-white rounded-2xl p-6 lg:p-7">
              <h3 className="font-display font-bold text-lg mb-2 flex items-center gap-2">
                <span aria-hidden="true">⚡</span> Our Response Promise
              </h3>
              <p className="font-body text-sm leading-relaxed text-white/95">
                We respond to every enquiry within <strong>2 business hours</strong>. You'll always speak to a real travel expert — never a bot or a script.
              </p>
            </div>

            {/* Registered & Trusted */}
            <div className="bg-drift border border-abyss/10 rounded-2xl p-6">
              <h3 className="font-display font-bold text-base text-abyss mb-4 flex items-center gap-2">
                <span aria-hidden="true">🔒</span> Registered & Trusted
              </h3>
              <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm font-body text-abyss">
                <dt className="text-ink/50">GST:</dt><dd className="font-mono">27ABMFA3990N1ZQ</dd>
                <dt className="text-ink/50">PAN:</dt><dd className="font-mono">ABMFA3990N</dd>
                <dt className="text-ink/50">Registered:</dt><dd>Mumbai, Maharashtra</dd>
                <dt className="text-ink/50">GST Note:</dt><dd className="text-ink/70">Invoices with GST provided on request.</dd>
              </dl>
              <p className="text-xs text-ink/50 mt-4 italic">Your data is never sold or shared with third parties.</p>
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="bg-white border border-abyss/10 rounded-2xl p-6 lg:p-10 shadow-[0_8px_30px_-12px_rgba(26,29,46,0.15)] lg:sticky lg:top-24 lg:self-start">
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Map */}
      <section aria-labelledby="map-heading">
        <h2 id="map-heading" className="sr-only">Office location on map</h2>
        <div className="bg-abyss py-4 px-4 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="font-body text-sm text-white/85 flex items-center gap-2">
            <span aria-hidden="true">📍</span> {ADDRESS}
          </p>
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-sm font-semibold text-blaze hover:text-horizon transition-colors"
          >
            Get Directions →
          </a>
        </div>
        <div
          className="w-full h-[320px] sm:h-[420px] bg-drift relative"
          ref={(el) => { if (el && !mapLoaded) { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMapLoaded(true); io.disconnect(); } }, { rootMargin: "300px" }); io.observe(el); } }}
        >
          {mapLoaded ? (
            <iframe
              src={MAP_EMBED_URL}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Adventourist office — 1 Madhav Kunj, Vile Parle, Mumbai"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-body text-sm text-ink/40">
              Loading map…
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 bg-drift" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p className="text-blaze font-display font-semibold tracking-[0.2em] text-xs uppercase mb-3">
              Quick Answers
            </p>
            <h2 id="faq-heading" className="font-display font-black text-3xl lg:text-5xl text-abyss leading-[1.1]">
              Frequently Asked <span className="text-blaze italic">Questions</span>
            </h2>
          </div>

          <dl className="divide-y divide-abyss/10">
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="py-2">
                  <dt>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`faq-${i}`}
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-4 text-left py-5 min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-2 rounded-sm"
                    >
                      <span className="font-display font-semibold text-base lg:text-lg text-abyss">{faq.q}</span>
                      <svg
                        className={`flex-shrink-0 w-5 h-5 text-blaze transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </dt>
                  <dd
                    id={`faq-${i}`}
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? "400px" : "0px" }}
                  >
                    <p className="font-body text-[15px] text-ink/70 leading-[1.7] pb-5 pr-8">{faq.a}</p>
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </section>
    </SiteLayout>
  );
}
