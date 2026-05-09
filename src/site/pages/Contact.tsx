import SiteLayout from "@/site/SiteLayout";
import ContactForm from "@/site/components/contact/ContactForm";
import FAQAccordion from "@/site/components/contact/FAQAccordion";
import MapEmbed from "@/site/components/contact/MapEmbed";
import { PHONE_DISPLAY, SUPPORT_EMAIL, WHATSAPP_URL } from "@/site/lib/constants";

export default function Contact() {
  return (
    <SiteLayout
      title="Contact Us | Adventourist"
      description="Talk to a real travel expert. Replies within 2 hours, Mon–Sat 9am–9pm IST. Call, WhatsApp or email Adventourist Mumbai."
    >
      {/* Hero */}
      <section className="bg-drift topo-texture py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="section-label mb-3">Let's Plan Together</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss leading-tight">
            Talk to <span className="text-blaze italic">a Real Person</span>
          </h1>
          <p className="font-body text-lg text-ink/60 mt-4 max-w-xl mx-auto">
            No call centres. No bots. You'll hear back from our team within 2 hours.
          </p>
        </div>
      </section>

      {/* Form + contact info */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="bg-white rounded-2xl border border-ink/10 p-6 lg:p-10">
            <ContactForm />
          </div>
          <aside className="space-y-5">
            <div className="bg-abyss text-white rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg mb-3">Reach us directly</h3>
              <ul className="space-y-3 text-sm font-body">
                <li>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Phone</p>
                  <a href={`tel:${PHONE_DISPLAY.replace(/\s/g, "")}`} className="text-white hover:text-horizon">{PHONE_DISPLAY}</a>
                </li>
                <li>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Email</p>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="text-white hover:text-horizon">{SUPPORT_EMAIL}</a>
                </li>
                <li>
                  <p className="text-white/50 text-xs uppercase tracking-wide">Hours</p>
                  <p className="text-white/80">Mon–Sat · 9AM–9PM IST</p>
                </li>
              </ul>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 bg-[#25D366] text-white font-display font-semibold px-5 py-3 rounded-full text-sm w-full justify-center"
              >
                💬 Chat on WhatsApp
              </a>
            </div>
            <div className="bg-horizon rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg text-abyss mb-2">Visit our office</h3>
              <p className="font-body text-sm text-abyss/80">
                1, Madhav Kunj, South Pond Road,<br />
                Vile Parle, Mumbai – 400056
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Map */}
      <MapEmbed />

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="section-label mb-3">Common Questions</p>
          <h2 className="font-display font-black text-3xl text-abyss mb-6">FAQs</h2>
          <FAQAccordion />
        </div>
      </section>
    </SiteLayout>
  );
}