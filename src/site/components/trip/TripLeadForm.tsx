import { useState, useEffect, useRef } from "react";
import { Input, Textarea, Select } from "@/site/ui/Input";
import { captureUTM, waLink } from "@/site/lib/utils";
import { useLeadCapture } from "@/site/hooks/useLeadCapture";
import { WHATSAPP_NUMBER, GROUP_SIZE_OPTIONS, BUDGET_OPTIONS } from "@/site/lib/constants";
import { formatINRPrice } from "@/site/lib/api";

interface Props {
  tripTitle: string;
  tripSlug: string;
  destination?: string;
  pricePerPerson?: number | null;
  className?: string;
}

const GROUP_OPTS = GROUP_SIZE_OPTIONS.map((g) => ({ label: g, value: g }));

export default function TripLeadForm({ tripTitle, tripSlug, destination, pricePerPerson, className = "" }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", dates: "", groupSize: "", budget: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const utmRef = useRef<Record<string, string>>({});
  const { submitLead, loading } = useLeadCapture();

  useEffect(() => { utmRef.current = captureUTM(); }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.phone.trim() || !/^[6-9]\d{9}$/.test(form.phone.replace(/[\s\-]/g, "")))
      e.phone = "Enter a valid Indian mobile number";
    return e;
  };

  const buildWA = () => {
    const parts = [
      `Hi! I'm ${form.name || "interested"}`,
      `and I'd like to plan the "${tripTitle}" trip`,
      form.dates ? `around ${form.dates}` : "",
      form.groupSize ? `for ${form.groupSize}` : "",
      form.budget ? `with budget ${form.budget}` : "",
      form.message ? `\n\nNotes: ${form.message}` : "",
      `\n\nCan you share details?`,
      ` [src:trip_detail|trip:${tripSlug}]`,
    ].filter(Boolean).join(" ");
    return parts;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    await submitLead({
      name: form.name,
      phone: form.phone,
      destination,
      group_size: form.groupSize,
      budget: form.budget,
      travel_month: form.dates,
      message: form.message,
      page_source: `trip_detail_${tripSlug}`,
      trip_title: tripTitle,
      trip_slug: tripSlug,
      trip_price: pricePerPerson ? formatINRPrice(pricePerPerson) : undefined,
    });

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildWA())}`, "_blank");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={`bg-white border border-abyss/10 rounded-2xl p-8 text-center ${className}`}>
        <div className="w-14 h-14 rounded-full bg-lagoon/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-lagoon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display font-black text-xl text-abyss mb-2">Enquiry sent!</h3>
        <p className="font-body text-sm text-ink/60 mb-5">A travel expert will reply within 2 hours.</p>
        <a
          href={waLink({ trip: tripTitle, slug: tripSlug, source: `trip_success_${tripSlug}` })}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe58] text-white font-display font-semibold px-5 py-3 rounded-full text-sm"
        >
          💬 Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-abyss/10 rounded-2xl p-6 lg:p-7 shadow-[0_8px_30px_-12px_rgba(26,29,46,0.18)] ${className}`}>
      <h3 className="font-display font-black text-xl lg:text-2xl text-abyss leading-tight">
        Plan This Trip <span className="text-blaze italic">Your Way</span>
      </h3>
      <p className="font-body text-sm text-ink/60 mt-1 mb-4">
        Tell us what you need — we'll customise it for free.
      </p>

      {pricePerPerson ? (
        <div className="mb-5">
          <p className="font-display font-black text-3xl text-abyss leading-none">
            {formatINRPrice(pricePerPerson)}
            <span className="font-body font-normal text-sm text-ink/50 ml-1">/person</span>
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
        <Input label="Your Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
        <Input label="Phone (+91) *" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={errors.phone} required />
        <Input label="Travel Dates" type="date" value={form.dates} onChange={(e) => setForm({ ...form, dates: e.target.value })} />
        <Select label="Group Size" value={form.groupSize} onChange={(e) => setForm({ ...form, groupSize: e.target.value })} options={GROUP_OPTS} placeholder="Group Size" />
        <Select label="Budget Per Person" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} options={BUDGET_OPTIONS} placeholder="Budget per person" />
        <Textarea label="Anything specific?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2} />

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 bg-blaze text-white font-display font-bold text-base rounded-full hover:bg-blaze/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blaze/25 disabled:opacity-60"
        >
          {loading ? "Sending…" : "Send via WhatsApp →"}
        </button>

        <p className="font-body text-[12px] text-ink/55 text-center pt-1">
          ⚡ Responds in 2 hrs · ✓ No booking fees · 🔒 100% secure
        </p>
      </form>
    </div>
  );
}
