import { useState, useEffect, useRef } from "react";
import { Input, Textarea, Select } from "@/site/ui/Input";
import { captureUTM, waLink } from "@/site/lib/utils";
import { useLeadCapture } from "@/site/hooks/useLeadCapture";
import { WHATSAPP_NUMBER, WHATSAPP_URL } from "@/site/lib/constants";

const DESTINATIONS = [
  "Bali", "Leh Ladakh", "Thailand", "Sri Lanka", "Singapore", "Vietnam",
  "Seychelles", "Himachal Pradesh", "Uttarakhand", "North East India", "Somewhere else…",
];

const GROUP_SIZE_OPTIONS = [
  { label: "Solo", value: "solo" },
  { label: "2 People", value: "2" },
  { label: "3–5", value: "3-5" },
  { label: "6–10", value: "6-10" },
  { label: "10+", value: "10+" },
];

const BUDGET_OPTIONS = [
  { label: "Under ₹30,000", value: "under-30k" },
  { label: "₹30K–60K", value: "30k-60k" },
  { label: "₹60K–1L", value: "60k-1l" },
  { label: "Above ₹1 Lakh", value: "above-1l" },
  { label: "Not sure yet", value: "not-sure" },
];

function buildWAMessage(d: { name: string; destinations: string[]; groupSize: string; dates: string; budget: string; message: string }) {
  const parts: string[] = [];
  parts.push(`Hi! I'm ${d.name || "a traveller"}`);
  if (d.destinations.length) parts.push(`and I want to travel to ${d.destinations.join(" & ")}`);
  if (d.groupSize) parts.push(`with ${d.groupSize}`);
  if (d.dates) parts.push(`around ${d.dates}`);
  if (d.budget) parts.push(`with a budget of ${d.budget} per person`);
  if (d.message) parts.push(`\n\nNotes: ${d.message}`);
  parts.push(`\n\nCan you help me plan this? [src:contact_page]`);
  return parts.join(" ");
}

export default function ContactForm() {
  const [dests, setDests] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "", dates: "", groupSize: "", budget: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const utmRef = useRef<Record<string, string>>({});
  const { submitLead } = useLeadCapture();

  useEffect(() => { utmRef.current = captureUTM(); }, []);

  const toggleDest = (d: string) =>
    setDests((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone.replace(/[\s\-]/g, "")))
      e.phone = "Enter a valid Indian mobile number";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email address";
    return e;
  };

  const waMessage = buildWAMessage({ name: form.name, destinations: dests, groupSize: form.groupSize, dates: form.dates, budget: form.budget, message: form.message });
  const showPreview = form.name.length > 0 || dests.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // 1) Open WhatsApp immediately — fire-first so no lead is ever lost.
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}`, "_blank");

    // 2) CRM capture (fire-and-forget — never block WA hand-off).
    submitLead({
      name: form.name,
      phone: form.phone,
      email: form.email,
      destination: dests.join(", ") || undefined,
      group_size: form.groupSize || undefined,
      budget: form.budget || undefined,
      travel_month: form.dates || undefined,
      message: form.message || undefined,
      page_source: "contact_page",
    }).catch(() => { /* never block UI on CRM errors */ });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-16 px-6 bg-drift rounded-2xl" aria-live="assertive">
        <div className="w-16 h-16 rounded-full bg-lagoon/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-lagoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display font-black text-2xl text-abyss mb-2">We've got your enquiry</h3>
        <p className="font-body text-base text-ink/70 mb-1">A travel expert will reply within 2 hours.</p>
        <p className="font-body text-sm text-ink/50 mb-6">Mon–Sat · 9AM–9PM IST</p>
        <a
          href={waLink({ message: waMessage, source: "contact_success" })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blaze text-white font-display font-semibold px-6 py-3 rounded-full hover:bg-blaze/90 transition-colors"
        >
          💬 Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Trip enquiry form">
      <div>
        <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-1">Send Us a Message</h2>
        <p className="font-body text-sm text-ink/60">
          We'll reach out within 2 hours with a personalised trip plan.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required aria-required="true" />
        <Input label="Phone (+91) *" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} required aria-required="true" />
      </div>

      <Input label="Email Address (optional)" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />

      <div>
        <p className="font-body font-semibold text-sm text-abyss mb-3">Where do you want to go?</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Destination interest">
          {DESTINATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDest(d)}
              aria-pressed={dests.includes(d)}
              className={`font-body text-[13px] px-4 py-2.5 rounded-full transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-1 ${
                dests.includes(d)
                  ? "bg-blaze text-white border border-blaze shadow-sm"
                  : "border border-abyss/15 bg-drift text-abyss hover:border-blaze/60 hover:bg-blaze/5"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input label="Travel Dates" type="date" value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} />
        <Select label="Group Size" value={form.groupSize} onChange={(e) => setForm({ ...form, groupSize: e.target.value })} options={GROUP_SIZE_OPTIONS} placeholder="Group Size" />
      </div>

      <Select label="Budget Per Person" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} options={BUDGET_OPTIONS} placeholder="Budget per person" />

      <Textarea label="Tell us about your dream trip" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />

      <div aria-live="polite" className="sr-only">{Object.values(errors).join(". ")}</div>

      {showPreview && (
        <div className="bg-drift rounded-xl p-4 text-sm font-body text-ink/70 italic border-l-4 border-blaze">
          <p className="font-semibold text-xs text-blaze mb-1 not-italic uppercase tracking-wide">
            Your WhatsApp message preview
          </p>
          “{waMessage}”
        </div>
      )}

      <button
        type="submit"
        className="w-full h-14 bg-blaze text-white font-display font-bold text-lg rounded-full hover:bg-blaze/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blaze/25"
      >
        Send via WhatsApp →
      </button>

      {/* Parallel path — direct WhatsApp for users who don't want to fill the form */}
      <div className="flex items-center py-0.5">
        <div className="flex-grow h-px bg-ink/10" />
        <span className="px-3 text-[11px] uppercase tracking-wider text-ink/40 font-body">or</span>
        <div className="flex-grow h-px bg-ink/10" />
      </div>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-14 bg-[#25D366] hover:bg-[#1ebe58] text-white font-display font-semibold rounded-full text-base flex items-center justify-center gap-2 transition-colors"
      >
        💬 Chat directly on WhatsApp
      </a>

      <p className="text-[11px] text-ink/40 text-center font-body">
        By submitting you agree to be contacted by our team. We never share your data.
      </p>
    </form>
  );
}
