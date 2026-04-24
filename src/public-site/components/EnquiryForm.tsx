import { useState } from "react";
import { Check } from "lucide-react";
import { api, type LeadInput } from "../lib/api";

type Props = Partial<Pick<LeadInput, "destination_id" | "itinerary_id" | "landing_page_id" | "source" | "page">> & {
  title?: string; subtitle?: string; afterMessage?: string; submitText?: string; className?: string;
};

const EnquiryForm = ({ title = "Enquire for Free", subtitle = "Our travel experts will call you within 24 hours.", afterMessage = "Thank you! We'll be in touch shortly.", submitText = "Submit Enquiry", className = "", ...ctx }: Props) => {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", travel_date: "", pax: 2, message: "", agreed: false, website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null); setLoading(true);
    try {
      await api.submitLead({
        name: form.name, email: form.email, mobile: form.mobile,
        travel_date: form.travel_date || null, pax: form.pax, message: form.message,
        website: form.website, ...ctx,
      });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const disabled = !form.name || !form.email || !form.mobile || !form.agreed || loading;

  return (
    <div className={`bg-card rounded-2xl shadow-xl p-6 border border-border ${className}`}>
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="h-7 w-7 text-accent" /></div>
          <p className="font-semibold text-card-foreground mb-1">Enquiry Submitted!</p>
          <p className="text-sm text-muted-foreground">{afterMessage}</p>
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-card-foreground text-lg">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-5">{subtitle}</p>
          <div className="space-y-3">
            {/* honeypot */}
            <input tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
              style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} aria-hidden />
            <input required placeholder="Full Name *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full h-10 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            <input required type="email" placeholder="Email *" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="w-full h-10 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            <div className="flex">
              <span className="h-10 px-3 flex items-center bg-muted border border-r-0 border-input rounded-l-lg text-xs text-muted-foreground">+91</span>
              <input required type="tel" placeholder="Mobile *" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))}
                className="flex-1 h-10 px-3 border border-input rounded-r-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.travel_date} onChange={e => setForm(p => ({ ...p, travel_date: e.target.value }))}
                className="h-10 px-3 border border-input rounded-lg text-sm bg-background text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <input type="number" min={1} placeholder="Travellers" value={form.pax} onChange={e => setForm(p => ({ ...p, pax: parseInt(e.target.value) || 1 }))}
                className="h-10 px-3 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <textarea rows={2} placeholder="Tell us about your trip (optional)" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={form.agreed} onChange={e => setForm(p => ({ ...p, agreed: e.target.checked }))} className="mt-0.5 accent-primary" />
              <span className="text-xs text-muted-foreground">I agree to the Terms & Conditions and Privacy Policy</span>
            </label>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button disabled={disabled} onClick={onSubmit}
              className="w-full h-11 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold rounded-lg transition-colors text-sm">
              {loading ? "Submitting..." : submitText}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnquiryForm;