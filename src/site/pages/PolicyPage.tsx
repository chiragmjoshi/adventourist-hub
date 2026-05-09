import SiteLayout from "@/site/SiteLayout";

interface Props {
  title: string;
  description?: string;
  sections: { heading: string; body: string }[];
}

export default function PolicyPage({ title, description, sections }: Props) {
  return (
    <SiteLayout title={`${title} | Adventourist`} description={description ?? title}>
      <section className="bg-drift py-12 lg:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss">{title}</h1>
          <p className="font-body text-sm text-ink/50 mt-3">Last updated: May 2026</p>
        </div>
      </section>
      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="font-display font-bold text-xl text-abyss mb-3">{s.heading}</h2>
              <p className="font-body text-[15px] text-ink/70 leading-[1.75] whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}

export const PrivacyPolicy = () => (
  <PolicyPage
    title="Privacy Policy"
    description="How Adventourist collects, uses and protects your personal information."
    sections={[
      { heading: "Information we collect", body: "We collect what you share with us when you submit a trip enquiry — name, phone, email and trip preferences. We also capture standard analytics (page views, referrer, UTM parameters)." },
      { heading: "How we use it", body: "Solely to plan your trip, send relevant follow-ups, and improve our services. We never sell your data." },
      { heading: "Sharing", body: "Information is shared with our internal team and trusted vendors (hotels, transport providers) only as required to deliver your trip." },
      { heading: "Your rights", body: "You can request deletion of your data at any time by emailing support@adventourist.in." },
    ]}
  />
);

export const TermsConditions = () => (
  <PolicyPage
    title="Terms & Conditions"
    sections={[
      { heading: "Booking", body: "All bookings are subject to availability. Confirmation is issued only after receipt of advance payment." },
      { heading: "Pricing", body: "Prices are quoted per person on twin-sharing unless stated otherwise. Subject to change until confirmed." },
      { heading: "Liability", body: "Adventourist acts as an agent for hotels, airlines and transport providers and is not liable for losses caused by third parties." },
      { heading: "Force majeure", body: "Trips affected by events beyond our control will be rescheduled where possible per vendor policies." },
    ]}
  />
);

export const RefundPolicy = () => (
  <PolicyPage
    title="Refund & Cancellation Policy"
    sections={[
      { heading: "Cancellation by guest", body: "30+ days before departure: 90% refund of advance.\n15–29 days: 50% refund.\n<15 days: no refund. Third-party charges follow vendor policies." },
      { heading: "Refund processing", body: "Refunds are processed within 7–10 working days to the original payment method." },
      { heading: "Changes by Adventourist", body: "If we cancel for operational reasons, you receive a full refund or option to reschedule." },
    ]}
  />
);

export const PaymentPolicy = () => (
  <PolicyPage
    title="Payment Policy"
    sections={[
      { heading: "Advance", body: "30% advance for domestic, 50% for international trips." },
      { heading: "Final payment", body: "Balance due 21 days before departure. For trips booked within 21 days, full payment is due at confirmation." },
      { heading: "Methods", body: "We accept UPI, NEFT, IMPS, RTGS and major credit cards from our verified accounts only." },
    ]}
  />
);