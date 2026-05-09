import { useState } from "react";

const FAQS = [
  {
    q: "How quickly will I hear back after submitting?",
    a: "We respond to every inquiry within 2 business hours. Mon–Sat, 9AM–9PM IST. You'll speak to a real travel expert, never a bot.",
  },
  {
    q: "Do you charge a planning or consultation fee?",
    a: "No. Planning and consultation is completely free. You only pay when you're ready to book your trip.",
  },
  {
    q: "Can I customise an existing itinerary?",
    a: "Every trip we build starts from your preferences, budget, and travel dates. Call it a template or call it a starting point — it always ends up uniquely yours.",
  },
  {
    q: "Do you handle international trips from India?",
    a: "Yes! We specialise in Bali, Thailand, Sri Lanka, Singapore, Vietnam, Seychelles, Azerbaijan, and more. International trips are our sweet spot.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <dl className="divide-y divide-[#E5E7EB]">
      {FAQS.map((faq, i) => (
        <div key={i} className="py-5">
          <dt>
            <button
              id={`faq-btn-${i}`}
              aria-expanded={open === i}
              aria-controls={`faq-answer-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between gap-4 text-left min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-2 rounded-sm"
            >
              <span className="font-display font-semibold text-[17px] text-abyss">{faq.q}</span>
              <svg
                className={`flex-shrink-0 w-5 h-5 text-blaze transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} 
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </dt>
          <dd
            id={`faq-answer-${i}`}
            role="region"
            aria-labelledby={`faq-btn-${i}`}
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{ maxHeight: open === i ? "300px" : "0px" }}
          >
            <p className="font-body text-[15px] text-[#555] leading-[1.7] pt-3 pb-5">{faq.a}</p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
