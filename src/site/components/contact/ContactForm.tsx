import { useState, useEffect, useRef } from "react";
import { Input, Textarea, Select } from "@/site/ui/Input";
import { captureUTM } from "@/site/lib/utils";

const DESTINATIONS = [
  "Bali",
  "Leh Ladakh",
  "Thailand",
  "Sri Lanka",
  "Singapore",
  "Vietnam",
  "Seychelles",
  "Himachal Pradesh",
  "Uttarakhand",
  "North East India",
  "Somewhere else…",
];

const GROUP_SIZE_OPTIONS = [
  { label: "Solo",     value: "solo" },
  { label: "2 People", value: "2" },
  { label: "3–5",      value: "3-5" },
  { label: "6–10",     value: "6-10" },
  { label: "10+",      value: "10+" },
];

const BUDGET_OPTIONS = [
  { label: "Under ₹30,000", value: "under-30k" },
  { label: "₹30K–60K",      value: "30k-60k" },
  { label: "₹60K–1L",       value: "60k-1l" },
  { label: "Above ₹1 Lakh", value: "above-1l" },
  { label: "Not sure yet",  value: "not-sure" },
];

function buildWAMessage({ name, destinations, groupSize, dates, budget, message }: {
  name: string; destinations: string[]; groupSize: string; dates: string; budget: string; message: string;
}): string {
  const parts: string[] = [];
  parts.push(`Hi! I'm ${name || "a traveller"}`);
  if (destinations.length > 0) parts.push(`and I want to travel to ${destinations.join(" and ")}`);
  if (groupSize) parts.push(`with ${groupSize}`);
  if (dates)     parts.push(`around ${dates}`);
  if (budget)    parts.push(`with a budget of ${budget} per person`);
  if (message)   parts.push(`\n\nAdditional notes: ${message}`);
  parts.push(`\n\nCan you help me plan this?`);
  return parts.join(" ");
}

export default function ContactForm() {
  const [dests, setDests]           = useState<string[]>([]);
  const [form, setForm]             = useState({ name: "", phone: "", email: "", dates: "", groupSize: "", budget: "", message: "" });
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [submitted, setSubmitted]   = useState(false);
  const utmRef = useRef<Record<string, string>>({});

  useEffect(() => { utmRef.current = captureUTM(); }, []);

  const toggleDest = (d: string) =>
    setDests((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    // Open WhatsApp immediately with natural message
    window.open(`https://wa.me/919930400694?text=${encodeURIComponent(waMessage)}`, "_blank");

    // Fire-and-forget CRM capture
    fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: "/leads",
        data: {
          name: form.name,
          mobile: form.phone,
          email: form.email,
          source: "landing_page",
          slug: "contact",
          ...utmRef.current,
        },
      }),
    }).catch(() => {});

    setSubmitted(true);
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16 px-6 bg-drift rounded-2xl" aria-live="assertive">
        <div className="w-16 h-16 rounded-full bg-lagoon/20 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-lagoon"  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display font-black text-2xl text-abyss mb-2">Opening WhatsApp…</h3>
        <p className="font-body text-[16px] text-[#555] mb-1">Your message is ready. We&apos;ll reply within 2 hours.</p>
        <p className="font-body text-[14px] text-[#888] mb-6">Mon–Sat · 9AM–9PM IST</p>
        <a
          href={`https://wa.me/919930400694?text=${encodeURIComponent(waMessage)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blaze text-white font-display font-semibold px-6 py-3 rounded-full hover:bg-blaze/90 transition-colors min-h-[44px]"
        >
          💬 Open WhatsApp again
        </a>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate aria-label="Trip enquiry form">
      <div>
        <h2 className="font-display font-bold text-2xl text-abyss mb-1">Send Us a Message</h2>
        <p className="font-body text-[14px] text-[#666] mb-2">
          We&apos;ll reach out within 2 hours with a personalised trip plan.
        </p>
      </div>

      {/* Row 1: Name + Phone */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
        <Input
          label="Your Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          required
          aria-required="true"
        />
        <Input
          label="Phone (+91) *"
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          error={errors.phone}
          required
          aria-required="true"
        />
      </div>

      {/* Row 2: Email */}
      <Input
        label="Email Address (optional)"
        type="email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
        error={errors.email}
      />

      {/* Row 3: Destination tags */}
      <div>
        <p className="font-body font-semibold text-[14px] text-abyss mb-3">
          Where do you want to go?
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Destination interest">
          {DESTINATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggleDest(d)}
              aria-pressed={dests.includes(d)}
              className={`font-body text-[13px] px-4 py-2 rounded-full transition-colors min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-1 ${
                dests.includes(d)
                  ? "bg-blaze text-white"
                  : "border border-abyss/20 bg-drift text-abyss hover:border-blaze/50"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Row 4: Travel dates + Group size */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-4">
        <Input
          label="Travel Dates"
          type="date"
          value={form.dates}
          onChange={(e) => setForm({ ...form, dates: e.target.value })}
        />
        <Select
          label="Group Size"
          value={form.groupSize}
          onChange={(e) => setForm({ ...form, groupSize: e.target.value })}
          options={GROUP_SIZE_OPTIONS}
          placeholder="Group Size"
        />
      </div>

      {/* Row 5: Budget */}
      <Select
        label="Budget Per Person"
        value={form.budget}
        onChange={(e) => setForm({ ...form, budget: e.target.value })}
        options={BUDGET_OPTIONS}
        placeholder="Budget per person"
      />

      {/* Row 6: Message */}
      <Textarea
        label="Tell us about your dream trip"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        rows={3}
      />

      {/* Error live region */}
      <div aria-live="polite" className="sr-only">
        {Object.values(errors).join(". ")}
      </div>

      {/* Message preview */}
      {showPreview && (
        <div className="bg-[#EEE5D5] rounded-xl p-4 text-sm font-body text-[#555] italic border-l-4 border-[#FF6F4C]">
          <p className="font-semibold text-xs text-[#FF6F4C] mb-1 not-italic uppercase tracking-wide">
            Your WhatsApp message preview:
          </p>
          &ldquo;{waMessage}&rdquo;
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        className="w-full h-14 bg-blaze text-white font-display font-bold text-lg rounded-full hover:bg-[#e55e3c] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        Send via WhatsApp →
      </button>
    </form>
  );
}
