import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { WHATSAPP_NUMBER } from "@/site/lib/constants";
import { captureUTM } from "@/site/lib/utils";

interface PlanTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlanTripModal({ isOpen, onClose }: PlanTripModalProps) {
  const [form, setForm] = useState({ name: "", phone: "", destination: "" });
  const [honeypot, setHoneypot] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const utmRef = useRef<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { utmRef.current = captureUTM(); }, []);

  // Lock scroll & focus first input when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => nameRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!form.name.trim()) { setError("Please enter your name."); return; }
    if (!/^[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }
    setError("");
    try {
      await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/leads",
          data: {
            name: form.name,
            mobile: form.phone,
            source: "landing_page",
            slug: "homepage",
            ...utmRef.current,
          },
        }),
      });
    } catch { /* fail silently */ }
    setSubmitted(true);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Plan a trip"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-abyss/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-drift flex items-center justify-center text-ink/60 hover:text-ink hover:bg-drift/80 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="bg-horizon px-6 pt-8 pb-6">
          <p className="font-body text-xs font-semibold uppercase tracking-widest text-abyss/60 mb-1">
            Free Trip Planning
          </p>
          <h2 className="font-display font-black text-2xl text-abyss leading-tight">
            Tell us your dream trip.<br />
            <span className="text-blaze">We&rsquo;ll plan it for you.</span>
          </h2>
          <p className="font-body text-sm text-abyss/60 mt-2">
            Our experts respond within 2 hours. Mon–Sat, 9am–9pm IST.
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-4xl mb-3">🎉</p>
              <h3 className="font-display font-bold text-xl text-abyss mb-2">
                We&rsquo;ve got your details!
              </h3>
              <p className="font-body text-sm text-ink/60 mb-5">
                Expect a call or WhatsApp from our team within 2 hours.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%20just%20submitted%20a%20trip%20inquiry.%20My%20name%20is%20${encodeURIComponent(form.name)}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white font-display font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-[#22c55e] transition-colors"
              >
                💬 WhatsApp us now
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Honeypot */}
              <input
                aria-hidden="true"
                tabIndex={-1}
                autoComplete="off"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }}
              />

              <div>
                <label className="font-body text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5 block">
                  Your Name *
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Priya Sharma"
                  className="w-full border border-ink/15 rounded-xl px-4 py-3 font-body text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-blaze/40 focus:border-blaze transition-colors"
                  required
                />
              </div>

              <div>
                <label className="font-body text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5 block">
                  Phone Number *
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 bg-drift rounded-l-xl border border-r-0 border-ink/15 font-body text-sm text-ink/60">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="9930400694"
                    maxLength={10}
                    className="flex-1 border border-ink/15 rounded-r-xl px-4 py-3 font-body text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-blaze/40 focus:border-blaze transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-body text-xs font-semibold text-ink/60 uppercase tracking-wide mb-1.5 block">
                  Where do you want to go?
                </label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="e.g. Bali, Ladakh, Thailand..."
                  className="w-full border border-ink/15 rounded-xl px-4 py-3 font-body text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-blaze/40 focus:border-blaze transition-colors"
                />
              </div>

              {error && (
                <p className="font-body text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blaze text-white font-display font-bold py-4 rounded-xl hover:bg-blaze/90 active:scale-[0.97] transition-all text-base"
              >
                Plan My Trip →
              </button>

              <div className="flex items-center justify-center gap-4 pt-1">
                {["⚡ 2hr response", "✓ Free planning", "🔒 No spam"].map((t) => (
                  <span key={t} className="font-body text-xs text-ink/40">{t}</span>
                ))}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
