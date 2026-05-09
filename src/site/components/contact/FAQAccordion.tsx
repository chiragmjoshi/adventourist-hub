import { useState } from "react";

const FAQS = [
  { q: "How quickly will I hear back after submitting?", a: "We respond to every enquiry within 2 business hours, Mon–Sat 9AM–9PM IST. You'll always speak to a real travel expert — never a bot." },
  { q: "Do you charge a planning or consultation fee?", a: "No. Planning and consultation are completely free. You only pay when you're ready to book your trip." },
  { q: "Can I customise an existing itinerary?", a: "Every trip we build starts from your preferences, budget and dates. Templates are just a starting point — your trip is always uniquely yours." },
  { q: "Do you handle international trips from India?", a: "Yes — Bali, Thailand, Sri Lanka, Singapore, Vietnam, Seychelles, Azerbaijan and more. International trips are our sweet spot." },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <dl className="divide-y divide-abyss/10">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="py-2">
            <dt>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 text-left py-5 min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-2 rounded-sm"
              >
                <span className="font-display font-semibold text-base lg:text-lg text-abyss">{faq.q}</span>
                <svg className={`flex-shrink-0 w-5 h-5 text-blaze transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </dt>
            <dd id={`faq-${i}`} className="overflow-hidden transition-all duration-300" style={{ maxHeight: isOpen ? "400px" : "0px" }}>
              <p className="font-body text-[15px] text-ink/70 leading-[1.7] pb-5 pr-8">{faq.a}</p>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
