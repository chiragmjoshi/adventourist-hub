import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteLayout from "@/site/SiteLayout";
import { WHATSAPP_NUMBER } from "@/site/lib/constants";

type Category =
  | "Booking & Planning"
  | "Payments & Pricing"
  | "During Your Trip"
  | "Cancellations & Refunds"
  | "About Adventourist";

interface FAQ {
  q: string;
  a: string;
  cat: Category;
}

const FAQS: FAQ[] = [
  // Booking & Planning
  {
    cat: "Booking & Planning",
    q: "How do I start planning a trip with Adventourist?",
    a: "Simply WhatsApp us, fill our contact form, or call us. Share your destination idea, dates, group size and rough budget. A real travel expert will reach out within 2 hours (Mon–Sat) to start designing your trip.",
  },
  {
    cat: "Booking & Planning",
    q: "How long before my travel date should I reach out?",
    a: "For domestic trips we recommend 3–4 weeks; for international 6–8 weeks. We also handle last-minute trips often — message us and we'll tell you what's realistic.",
  },
  {
    cat: "Booking & Planning",
    q: "Can you customise an existing itinerary on your website?",
    a: "Yes — every itinerary on our site is a starting point. We tweak duration, hotel category, activities, pace and inclusions to fit your preferences and budget.",
  },
  {
    cat: "Booking & Planning",
    q: "Do you handle solo travellers, families, honeymoons and groups?",
    a: "All of the above. We've planned trips for solo travellers, couples, multi-generation families, honeymooners, friend groups and corporate offsites.",
  },

  // Payments & Pricing
  {
    cat: "Payments & Pricing",
    q: "Do you charge any booking or service fees?",
    a: "No. ₹0 booking fees, no hidden mark-ups. The price you see is the price you pay. Our margin is built into the supplier rates we negotiate on your behalf.",
  },
  {
    cat: "Payments & Pricing",
    q: "What payment methods do you accept?",
    a: "Bank transfer (NEFT/IMPS/RTGS), UPI (GPay, PhonePe, Paytm, BHIM), and Visa/Mastercard/RuPay credit & debit cards via secure payment gateway. NRI and international payments accepted via wire transfer.",
  },
  {
    cat: "Payments & Pricing",
    q: "How much advance is required to confirm a booking?",
    a: "Typically 30–50% of the total trip cost is required as advance to confirm hotels, flights and activities. The exact amount is mentioned in your booking confirmation. Balance is due 15–20 days before departure.",
  },
  {
    cat: "Payments & Pricing",
    q: "Will I get a proper invoice with GST?",
    a: "Yes. We issue a proforma invoice at the time of booking and a final GST tax invoice once full payment is received. Our GSTIN is 27ABMFA3990N1ZQ.",
  },

  // During Your Trip
  {
    cat: "During Your Trip",
    q: "Will someone be reachable while I'm travelling?",
    a: "Yes — you get a dedicated trip coordinator on WhatsApp 24×7 for the duration of your trip. We also share emergency local contacts at every destination.",
  },
  {
    cat: "During Your Trip",
    q: "What happens if something goes wrong on the trip?",
    a: "Message us immediately. We coordinate directly with hotels, transport and ground partners to fix issues — flight changes, room upgrades, vehicle breakdowns, missed activities — without you having to chase anyone.",
  },
  {
    cat: "During Your Trip",
    q: "Are local SIMs, currency and visa support included?",
    a: "We help with all of these — visa documentation guidance, forex recommendations, and local SIM/eSIM suggestions. Actual purchases are made by you.",
  },

  // Cancellations & Refunds
  {
    cat: "Cancellations & Refunds",
    q: "What is your standard cancellation policy?",
    a: "45+ days before departure: 10% of trip cost. 30–44 days: 25%. 15–29 days: 50%. 7–14 days: 75%. Less than 7 days or no-show: 100%. Some components (flights, peak-season hotels) may be non-refundable. Full policy is on our Refund & Cancellation Policy page.",
  },
  {
    cat: "Cancellations & Refunds",
    q: "How long do refunds take?",
    a: "Refunds are processed within 7–10 business days after the cancellation amount is calculated. Your bank may take an additional 3–5 days to credit it.",
  },
  {
    cat: "Cancellations & Refunds",
    q: "Can I reschedule instead of cancelling?",
    a: "Often yes, with lower fees than cancellation. Date changes depend on supplier availability and any price difference between old and new dates. Tell us as early as possible.",
  },

  // About Adventourist
  {
    cat: "About Adventourist",
    q: "Where are you based?",
    a: "We're based in Mumbai (Vile Parle), Maharashtra. Our team works across India and our local partners cover all the destinations we plan for.",
  },
  {
    cat: "About Adventourist",
    q: "Are you a registered company?",
    a: "Yes. Adventourist is a registered Indian travel company with GSTIN 27ABMFA3990N1ZQ and PAN ABMFA3990N. All bookings are backed by GST invoices.",
  },
  {
    cat: "About Adventourist",
    q: "How is Adventourist different from a regular travel agency?",
    a: "We don't sell off-the-shelf packages. Every itinerary is built from scratch around your interests, pace and budget. You speak to one expert from enquiry to return — not a call centre — and we charge zero booking fees.",
  },
];

const CATEGORIES: Array<"All" | Category> = [
  "All",
  "Booking & Planning",
  "Payments & Pricing",
  "During Your Trip",
  "Cancellations & Refunds",
  "About Adventourist",
];

function FAQItem({ faq, idx }: { faq: FAQ; idx: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-ink/10">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
        aria-controls={`faq-${idx}`}
      >
        <span className="font-display font-semibold text-abyss text-[15.5px] sm:text-[17px] leading-snug group-hover:text-blaze transition-colors">
          {faq.q}
        </span>
        <span
          className={`w-8 h-8 rounded-full bg-drift flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180 bg-blaze/15" : ""}`}
          aria-hidden
        >
          <svg className="w-4 h-4 text-abyss" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      <div
        id={`faq-${idx}`}
        className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="font-body text-ink/70 text-[15px] leading-[1.75] pr-12">{faq.a}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQs() {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<"All" | Category>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (activeCat !== "All" && f.cat !== activeCat) return false;
      if (!q) return true;
      return f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    });
  }, [query, activeCat]);

  const grouped = useMemo(() => {
    const map = new Map<Category, FAQ[]>();
    filtered.forEach((f) => {
      const arr = map.get(f.cat) ?? [];
      arr.push(f);
      map.set(f.cat, arr);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://adventourist.in/" },
            { "@type": "ListItem", position: 2, name: "FAQs", item: "https://adventourist.in/faqs" },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <SiteLayout
      title="FAQs | Adventourist — Booking, Payments, Cancellations & More"
      description="Answers to common questions about planning a trip with Adventourist — booking process, payment terms, cancellations, on-trip support and more."
      keywords="adventourist faq, travel agency faq, booking process, cancellation policy, payment terms"
      jsonLd={jsonLd}
    >
      {/* Hero — clean cream, no topo lines */}
      <section className="bg-drift">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-20">
          <nav className="font-body text-[13px] text-ink/60 mb-8" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-blaze">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-abyss font-medium">FAQs</span>
          </nav>
          <div className="max-w-3xl">
            <p className="font-display text-[12px] font-bold tracking-[0.22em] uppercase text-blaze mb-5">Got Questions?</p>
            <h1 className="font-display font-black text-abyss leading-[0.98] tracking-tight text-5xl sm:text-6xl lg:text-[80px]">
              Frequently Asked
              <span className="block text-blaze mt-1">Questions</span>
            </h1>
            <p className="font-body text-[16px] sm:text-[17px] text-ink/65 leading-[1.7] max-w-xl mt-6">
              Everything you need to know about planning your trip with Adventourist. Can't find what you're looking for? Just{" "}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question that's not in your FAQs. [src:faqs_page]")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blaze underline underline-offset-2 hover:text-blaze/80"
              >
                WhatsApp us
              </a>
              !
            </p>

            {/* Search */}
            <div className="mt-8 max-w-xl">
              <label htmlFor="faq-search" className="sr-only">Search questions</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-ink/40" aria-hidden>
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>
                </span>
                <input
                  id="faq-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search questions…"
                  className="w-full bg-white rounded-full pl-12 pr-5 py-4 font-body text-[15px] text-abyss placeholder-ink/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-blaze/40"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {/* Category chips */}
          <div className="flex flex-wrap gap-2 sm:gap-3 mb-10 pb-6 border-b border-ink/10">
            {CATEGORIES.map((c) => {
              const active = activeCat === c;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`px-4 sm:px-5 py-2 rounded-full font-display text-[13.5px] font-semibold transition-colors ${
                    active
                      ? "bg-blaze text-white"
                      : "bg-drift text-abyss/80 hover:bg-drift/70"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {grouped.length === 0 && (
            <div className="text-center py-16">
              <p className="font-body text-ink/60 text-[15px] mb-4">No questions match "{query}".</p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi! I couldn't find an answer to: ${query}. [src:faqs_no_match]`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold px-5 py-3 rounded-full text-[14px]"
              >
                💬 Ask us on WhatsApp
              </a>
            </div>
          )}

          <div className="space-y-12">
            {grouped.map(([cat, items]) => (
              <section key={cat}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="block w-1 h-7 bg-blaze rounded-full" aria-hidden />
                  <h2 className="font-display font-black text-abyss text-2xl sm:text-[26px]">{cat}</h2>
                </div>
                <div className="mt-2">
                  {items.map((f, i) => (
                    <FAQItem key={`${cat}-${i}`} faq={f} idx={i} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="bg-abyss">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <h2 className="font-display font-black text-white text-3xl sm:text-4xl mb-3">Still have a question?</h2>
          <p className="font-body text-white/70 text-[16px] mb-8 max-w-xl mx-auto">
            We're real travel experts in Mumbai. Message us on WhatsApp and we'll respond within 2 hours, Mon–Sat.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I have a question for the team. [src:faqs_cta]")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-blaze hover:bg-blaze/90 text-white font-display font-bold px-7 py-4 rounded-full text-[15px] transition-colors"
            >
              💬 WhatsApp the Team
            </a>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center bg-white/10 hover:bg-white/15 text-white font-display font-bold px-7 py-4 rounded-full text-[15px] transition-colors border border-white/20"
            >
              Use the contact form →
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
