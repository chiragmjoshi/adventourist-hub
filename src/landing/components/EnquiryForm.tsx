import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LandingPageData, waLink, WHATSAPP_URL } from "../shared";

interface Props {
  page: LandingPageData;
  variant?: "card" | "flat" | "compact";
  className?: string;
  buttonLabel?: string;
}

export default function EnquiryForm({ page, variant = "card", className = "", buttonLabel }: Props) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    pax: "2",
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.name || !form.mobile || !form.email) return;
    setSubmitting(true);

    // 1) Open WhatsApp immediately — synchronous, no await
    const destName = page.destinations?.name || "";
    const paxLabel = form.pax === "10+" ? "10+ people" : `${form.pax} ${form.pax === "1" ? "person" : "people"}`;
    const waMsg = `Hi! My name is ${form.name}. I'm interested in ${page.hero_headline || page.name || "your trip"}${destName ? ` (${destName})` : ""}. We are ${paxLabel} travelling. Please share more details! [src:landing_${page.slug}]`;
    try {
      window.open(waLink(waMsg), "_blank");
    } catch {
      /* popup blocked — ignore, lead still saved */
    }

    // 2) Fire-and-forget the CRM insert
    supabase.functions
      .invoke("submit-lead", {
        body: {
          name: form.name,
          mobile: form.mobile,
          email: form.email,
          notes: `Pax: ${form.pax}`,
          destination_name: destName || undefined,
          landing_page_id: page.id,
          channel: page.channel || "Website",
          platform: page.platform || "Paid",
          campaign_type: page.campaign_type || undefined,
          ad_group: page.ad_group || undefined,
          landing_url: window.location.pathname + window.location.search,
          referrer_url: document.referrer || undefined,
        },
      })
      .catch(() => {
        /* silent — WA already opened, lead capture is best-effort */
      });

    // 3) Navigate to thank-you
    const name = encodeURIComponent(form.name);
    navigate(`/l/${page.slug}/thank-you?name=${name}`);
  };

  const isCompact = variant === "compact";
  const wrapperClass =
    variant === "card"
      ? `bg-white rounded-2xl shadow-2xl p-6 sm:p-8 ${className}`
      : variant === "flat"
      ? `bg-white rounded-2xl shadow-lg p-6 sm:p-8 ${className}`
      : `bg-white rounded-xl shadow-xl p-4 ${className}`;

  const inputCls =
    "w-full h-12 px-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30 focus:border-[#FF6F4C] bg-white";

  return (
    <div className={wrapperClass}>
      {!isCompact && (
        <>
          <h3 className="font-extrabold text-gray-900 text-lg">
            {page.form_title || "Get Your Free Quote"}
          </h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">
            {page.form_subtitle || "We reply within 2 hours."}
          </p>
        </>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          required
          placeholder="Full Name *"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          style={{ fontSize: "16px" }}
          className={inputCls}
        />
        <input
          required
          type="email"
          placeholder="Email Address *"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          style={{ fontSize: "16px" }}
          className={inputCls}
        />
        <div className="flex">
          <span className="h-12 px-3 flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
            +91
          </span>
          <input
            required
            type="tel"
            placeholder="Mobile Number *"
            value={form.mobile}
            maxLength={10}
            pattern="[6-9][0-9]{9}"
            onChange={(e) => setForm((p) => ({ ...p, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            style={{ fontSize: "16px" }}
            className={`${inputCls} rounded-l-none`}
          />
        </div>
        <select
          value={form.pax}
          onChange={(e) => setForm((p) => ({ ...p, pax: e.target.value }))}
          style={{ fontSize: "16px" }}
          className={inputCls}
        >
          <option value="" disabled>How many people?</option>
          {["1","2","3","4","5","6","7","8","9","10","10+"].map((n) => (
            <option key={n} value={n}>{n} {n === "1" ? "traveller" : "travellers"}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!form.name || !form.mobile || !form.email || submitting}
          className="w-full h-12 bg-[#FF6F4C] hover:bg-[#e5603f] disabled:opacity-50 text-white font-bold rounded-full transition-colors text-base"
        >
          {buttonLabel || page.form_submit_text || "Get Free Quote →"}
        </button>
        {!isCompact && (
          <>
            <div className="relative flex items-center py-1">
              <div className="flex-grow h-px bg-gray-200" />
              <span className="px-3 text-[11px] uppercase tracking-wider text-gray-400 font-medium">or</span>
              <div className="flex-grow h-px bg-gray-200" />
            </div>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-[#25D366] hover:bg-[#1ebe58] text-white font-semibold rounded-full transition-colors text-base flex items-center justify-center gap-2"
            >
              💬 Chat on WhatsApp
            </a>
            <p className="text-center text-[11px] text-gray-400 pt-1">🔒 Your details are safe with us</p>
          </>
        )}
      </form>
    </div>
  );
}