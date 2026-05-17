import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatINR } from "@/lib/formatINR";
import { Menu, X, MapPin, Calendar, DollarSign, Sun, Users, Tag, ChevronDown, Check, Phone, MessageCircle } from "lucide-react";

/* ─────────────── helpers ─────────────── */
const waLink = (msg: string) =>
  `https://wa.me/919930400694?text=${encodeURIComponent(msg)}`;

/* ─────────────── component ─────────────── */
const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFormOpen, setMobileFormOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);
  const formRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "", email: "", mobile: "", travel_date: "", pax: 1, message: "", agreed: false,
  });
  const [submitted, setSubmitted] = useState(false);

  /* ─── queries ─── */
  const { data: page, isLoading, error } = useQuery({
    queryKey: ["public_landing_page", slug],
    queryFn: async () => {
      let q = supabase.from("landing_pages").select("*, destinations(name, testimonials)").eq("slug", slug!);
      if (!isPreview) q = q.eq("is_active", true);
      const { data, error } = await q.single();
      if (error) throw error;
      return data;
    },
  });

  const { data: itinerary } = useQuery({
    queryKey: ["public_itinerary", page?.itinerary_id],
    enabled: !!(page as any)?.itinerary_id,
    queryFn: async () => {
      const { data } = await supabase.from("itineraries").select("headline, itinerary_days, inclusions, exclusions").eq("id", (page as any).itinerary_id!).single();
      return data;
    },
  });

  /* ─── meta ─── */
  useEffect(() => {
    // GTM (public landing pages only)
    if (typeof window !== "undefined" && !(window as any).__gtmLoaded) {
      (window as any).__gtmLoaded = true;
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const gs = document.createElement("script");
      gs.async = true;
      gs.src = "https://www.googletagmanager.com/gtm.js?id=GTM-NDHCWP9";
      document.head.appendChild(gs);
      const ns = document.createElement("noscript");
      ns.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NDHCWP9" height="0" width="0" style="display:none;visibility:hidden"></iframe>';
      document.body.insertBefore(ns, document.body.firstChild);
    }
    if (!page) return;
    document.title = (page as any).seo_title || page.hero_headline || page.name;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) { el = document.createElement("meta"); (name.startsWith("og:") ? el.setAttribute("property", name) : el.setAttribute("name", name)); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", (page as any).seo_description || page.hero_subtext || "");
    setMeta("og:title", (page as any).seo_title || page.hero_headline || "");
    setMeta("og:description", (page as any).seo_description || page.hero_subtext || "");
    if ((page as any).hero_image) setMeta("og:image", (page as any).hero_image);
    setMeta("og:url", `https://www.adventourist.in/l/${slug}`);

    // JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "TouristTrip", name: page.hero_headline, description: page.hero_subtext, touristType: page.suitable_for?.join(", ") },
        { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://www.adventourist.in" }, { "@type": "ListItem", position: 2, name: page.hero_headline, item: `https://www.adventourist.in/l/${slug}` }] },
        { "@type": "TravelAgency", name: "Adventourist", url: "https://www.adventourist.in", address: { "@type": "PostalAddress", streetAddress: "1 Madhav Kunj South Pond Road, Vile Parle", addressLocality: "Mumbai", postalCode: "400056", addressCountry: "IN" } },
      ],
    };
    let script = document.getElementById("jsonld-landing");
    if (!script) { script = document.createElement("script"); script.id = "jsonld-landing"; script.setAttribute("type", "application/ld+json"); document.head.appendChild(script); }
    script.textContent = JSON.stringify(jsonLd);
  }, [page, slug]);

  /* ─── form submit ─── */
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email || undefined,
          travel_date: formData.travel_date || undefined,
          notes: formData.message
            ? `Pax: ${formData.pax}\n${formData.message}`
            : `Pax: ${formData.pax}`,
          destination_name: (page as any)?.destinations?.name || undefined,
          landing_page_id: page?.id || undefined,
          channel: page?.channel || "Website",
          platform: page?.platform || "Paid",
          campaign_type: page?.campaign_type || undefined,
          ad_group: page?.ad_group || undefined,
          landing_url: window.location.pathname + window.location.search,
          referrer_url: document.referrer || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => setSubmitted(true),
  });

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  /* ─── loading / 404 ─── */
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse text-lg font-medium text-gray-400">Loading...</div></div>;
  if (error || !page) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="text-gray-500">This page doesn't exist or has been deactivated.</p>
      <a href="https://www.adventourist.in" className="text-[#FF6F4C] hover:underline text-sm">Go to Adventourist →</a>
    </div>
  );

  const destName = (page as any).destinations?.name || "";
  const testimonials = (page as any).destinations?.testimonials || [];
  const inclusions = (page as any).custom_inclusions || itinerary?.inclusions || "";
  const exclusions = (page as any).custom_exclusions || itinerary?.exclusions || "";
  const days: any[] = (itinerary?.itinerary_days as any[]) || [];
  const gallery: string[] = (page as any).gallery || [];
  const afterSubmitMsg = (page as any).form_after_submit_message || "Thank you! We'll call you within 24 hours.";

  const navLinks = [
    { label: "Overview", id: "hero" },
    ...(days.length > 0 ? [{ label: "Itinerary", id: "itinerary" }] : []),
    ...(inclusions || exclusions ? [{ label: "Inclusions", id: "inclusions" }] : []),
    ...(gallery.length > 0 ? [{ label: "Gallery", id: "gallery" }] : []),
    { label: "Why Adventourist", id: "why-adventourist" },
    ...(testimonials.length > 0 ? [{ label: "Testimonials", id: "testimonials" }] : []),
  ];

  /* ─── form card (reusable) ─── */
  const EnquiryForm = ({ className = "" }: { className?: string }) => (
    <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="h-7 w-7 text-green-600" /></div>
          <p className="font-semibold text-gray-900 mb-1">Enquiry Submitted!</p>
          <p className="text-sm text-gray-500">{afterSubmitMsg}</p>
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-gray-900 text-lg">{(page as any).form_title || "Enquire for Free"}</h3>
          <p className="text-xs text-gray-500 mt-1 mb-5">{(page as any).form_subtitle || "Our travel experts will call you."}</p>
          <div className="space-y-3">
            <input required placeholder="Full Name *" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              style={{ fontSize: "16px" }}
              className="w-full h-12 px-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30 focus:border-[#FF6F4C]" />
            <input required type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              style={{ fontSize: "16px" }}
              className="w-full h-12 px-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30 focus:border-[#FF6F4C]" />
            <div className="flex">
              <span className="h-12 px-3 flex items-center bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">+91</span>
              <input required type="tel" placeholder="Mobile No *" value={formData.mobile} onChange={e => setFormData(p => ({ ...p, mobile: e.target.value }))}
                style={{ fontSize: "16px" }}
                className="flex-1 h-12 px-3 border border-gray-200 rounded-r-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30 focus:border-[#FF6F4C]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={formData.travel_date} onChange={e => setFormData(p => ({ ...p, travel_date: e.target.value }))}
                style={{ fontSize: "16px" }}
                className="h-12 px-3 border border-gray-200 rounded-lg text-base text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30" />
              <input type="number" min={1} placeholder="Travellers" value={formData.pax} onChange={e => setFormData(p => ({ ...p, pax: parseInt(e.target.value) || 1 }))}
                style={{ fontSize: "16px" }}
                className="h-12 px-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30" />
            </div>
            <textarea rows={2} placeholder="Message (optional)" value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
              style={{ fontSize: "16px" }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6F4C]/30 resize-none" />
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.agreed} onChange={e => setFormData(p => ({ ...p, agreed: e.target.checked }))}
                className="mt-0.5 accent-[#FF6F4C]" />
              <span className="text-xs text-gray-500">{(page as any).form_terms_label || "I agree to the Terms & Conditions"}</span>
            </label>
            <button
              disabled={!formData.name || !formData.email || !formData.mobile || !formData.agreed || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              className="w-full h-14 bg-[#FF6F4C] hover:bg-[#e5603f] disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-base">
              {submitMutation.isPending ? "Submitting..." : (page as any).form_submit_text || "Submit"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Preview banner */}
      {isPreview && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-2 text-xs font-medium">⚠️ Preview Mode — This page is not live yet</div>
      )}

      {/* ─── NAV ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <a href="https://www.adventourist.in" className="font-bold text-lg tracking-tight text-[#1A1D2E]">Adventourist</a>
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="text-xs text-gray-600 hover:text-[#FF6F4C] transition-colors font-medium">{l.label}</button>
            ))}
            <button onClick={() => scrollTo("enquiry-desktop")} className="bg-[#FF6F4C] hover:bg-[#e5603f] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">Talk to Us</button>
          </div>
          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 py-3 px-4 space-y-2">
            {navLinks.map(l => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="block w-full text-left text-sm text-gray-600 hover:text-[#FF6F4C] py-1.5">{l.label}</button>
            ))}
          </div>
        )}
      </nav>

      {/* ─── HERO ─── */}
      <section id="hero" className="relative h-screen md:h-screen max-h-[900px] min-h-[500px] flex items-center" style={{ height: "clamp(500px, 100vh, 900px)" }}>
        {(page as any).hero_image && <img src={(page as any).hero_image} alt={page.hero_headline || ""} className="absolute inset-0 w-full h-full object-cover" loading="eager" />}
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full">
          <div className="max-w-2xl">
            {destName && <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full mb-4">{destName}</span>}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
              {page.hero_headline}
            </h1>
            {page.hero_subtext && <p className="text-base sm:text-lg text-white/70 mb-8 max-w-xl">{page.hero_subtext}</p>}
            <div className="flex flex-wrap gap-3">
              {days.length > 0 && (
                <button onClick={() => scrollTo("itinerary")} className="px-5 py-2.5 border-2 border-white text-white rounded-lg font-medium text-sm hover:bg-white/10 transition-colors">View Itinerary</button>
              )}
              <button onClick={() => { if (window.innerWidth < 768) setMobileFormOpen(true); else scrollTo("enquiry-desktop"); }}
                className="px-5 py-2.5 bg-[#FF6F4C] text-white rounded-lg font-medium text-sm hover:bg-[#e5603f] transition-colors">Enquire Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRIP SUMMARY STRIP ─── */}
      <section className="bg-[#EEE5D5] py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-wrap gap-3 justify-center">
            {destName && <Pill icon={<MapPin className="h-3.5 w-3.5" />} label={destName} />}
            {(page as any).stay_days && <Pill icon={<Calendar className="h-3.5 w-3.5" />} label={(page as any).stay_days} />}
            {page.budget && <Pill icon={<DollarSign className="h-3.5 w-3.5" />} label={`${formatINR(page.budget)} Per Person onwards`} />}
            {(page as any).best_time_to_visit?.length > 0 && <Pill icon={<Sun className="h-3.5 w-3.5" />} label={((page as any).best_time_to_visit || page.time_to_visit)?.join(", ")} />}
            {page.suitable_for?.length > 0 && <Pill icon={<Users className="h-3.5 w-3.5" />} label={page.suitable_for.join(", ")} />}
            {(page as any).destination_type?.length > 0 && <Pill icon={<Tag className="h-3.5 w-3.5" />} label={(page as any).destination_type.join(", ")} />}
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT + STICKY FORM ─── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="flex gap-8">
          {/* Left content */}
          <div className="flex-1 min-w-0 space-y-16">

            {/* ITINERARY */}
            {days.length > 0 && (
              <section id="itinerary">
                <p className="text-xs font-semibold text-[#FF6F4C] uppercase tracking-widest mb-2">Itinerary</p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8">Your Day-by-Day Experience</h2>
                <div className="space-y-3">
                  {days.map((day: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedDay(expandedDay === idx ? null : idx)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-[#FF6F4C] font-bold text-sm w-14 shrink-0">Day {idx + 1}</span>
                          <span className="font-semibold text-sm">{day.title || `Day ${idx + 1}`}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${expandedDay === idx ? "rotate-180" : ""}`} />
                      </button>
                      {expandedDay === idx && day.description && (
                        <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                          <p className="text-sm text-gray-600 leading-relaxed pl-[68px]">{day.description}</p>
                          {day.accommodation && <p className="text-xs text-gray-500 pl-[68px] mt-2">🏨 {day.accommodation}</p>}
                          {(day.meals?.breakfast || day.meals?.lunch || day.meals?.dinner) && (
                            <p className="text-xs text-gray-500 pl-[68px] mt-1">
                              🍽 {[day.meals?.breakfast && "Breakfast", day.meals?.lunch && "Lunch", day.meals?.dinner && "Dinner"].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* INCLUSIONS & EXCLUSIONS */}
            {(inclusions || exclusions) && (
              <section id="inclusions">
                <p className="text-xs font-semibold text-[#FF6F4C] uppercase tracking-widest mb-2">What's Included</p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8">Inclusions & Exclusions</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {inclusions && (
                    <div className="bg-[#EEE5D5]/50 rounded-xl p-6 border border-[#056147]/10">
                      <h3 className="font-semibold text-[#056147] mb-4 flex items-center gap-2">
                        <Check className="h-4 w-4" /> Inclusions
                      </h3>
                      <ul className="space-y-2">
                        {inclusions.split("\n").filter(Boolean).map((line: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <Check className="h-3.5 w-3.5 text-[#056147] shrink-0 mt-0.5" />{line.replace(/^[-•]\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {exclusions && (
                    <div className="bg-red-50/50 rounded-xl p-6 border border-red-100">
                      <h3 className="font-semibold text-red-600 mb-4 flex items-center gap-2">
                        <X className="h-4 w-4" /> Exclusions
                      </h3>
                      <ul className="space-y-2">
                        {exclusions.split("\n").filter(Boolean).map((line: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <X className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />{line.replace(/^[-•]\s*/, "")}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* GALLERY */}
            {gallery.length > 0 && (
              <section id="gallery">
                <p className="text-xs font-semibold text-[#FF6F4C] uppercase tracking-widest mb-2">Gallery</p>
                <h2 className="text-2xl sm:text-3xl font-bold mb-8">Gallery</h2>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                  {gallery.map((url, i) => (
                    <img key={i} src={url} alt={`Gallery ${i + 1}`} loading="lazy"
                      className="w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity break-inside-avoid"
                      onClick={() => setLightboxImg(url)} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Desktop sticky form */}
          <div className="hidden md:block w-[340px] shrink-0" id="enquiry-desktop" ref={formRef}>
            <div className="sticky top-20">
              <EnquiryForm />
            </div>
          </div>
        </div>
      </div>

      {/* ─── WHY ADVENTOURIST ─── */}
      <section id="why-adventourist" className="bg-[#056147] text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2 text-center">Trust</p>
          <h2 className="text-2xl sm:text-3xl font-bold mb-10 text-center">Why Adventourist?</h2>
          {(page as any).why_adventourist ? (
            <p className="text-white/80 text-center max-w-2xl mx-auto leading-relaxed">{(page as any).why_adventourist}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { emoji: "🧭", title: "Expert-Led Planning", desc: "Personalised itineraries crafted by travel experts who know every destination" },
                { emoji: "🤝", title: "Hassle-Free Experience", desc: "From booking to return, we handle everything so you just enjoy the journey" },
                { emoji: "🌍", title: "Local Expertise", desc: "Deep connections with local guides and partners for authentic experiences" },
                { emoji: "💬", title: "24/7 Support", desc: "Your dedicated travel expert is always available before and during your trip" },
              ].map(c => (
                <div key={c.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                  <span className="text-3xl mb-3 block">{c.emoji}</span>
                  <h3 className="font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-white/70 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      {Array.isArray(testimonials) && testimonials.length > 0 && (
        <section id="testimonials" className="bg-[#EEE5D5] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold mb-10 text-center">What Our Travellers Say</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(testimonials as any[]).slice(0, 3).map((t: any, i: number) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="flex gap-0.5 mb-3">{"★★★★★".split("").map((s, j) => <span key={j} className="text-yellow-400 text-sm">{s}</span>)}</div>
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">"{t.quote || t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name || t.author}</p>
                    {t.trip && <span className="text-xs bg-[#FF6F4C]/10 text-[#FF6F4C] px-2 py-0.5 rounded-full mt-1 inline-block">{t.trip}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FINAL CTA ─── */}
      <section className="bg-[#1A1D2E] text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Experience {destName || "Your Dream Trip"}?</h2>
          <p className="text-white/60 mb-8">Our travel experts are ready to help plan your perfect getaway.</p>
          <a href={waLink(`Hi! I'm interested in the ${page.hero_headline} trip. Please share more details.`)}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm">
            <MessageCircle className="h-4 w-4" />Chat with Our Travel Expert
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#1A1D2E] border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-white/60">Adventourist</span>
            <span>© 2026 Adventourist</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white/60">Privacy Policy</a>
            <a href="#" className="hover:text-white/60">Terms & Conditions</a>
            <span>GST: 27ABMFA3990N1ZQ</span>
          </div>
        </div>
      </footer>

      {/* ─── MOBILE STICKY BUTTON ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button onClick={() => setMobileFormOpen(true)} className="w-full h-14 bg-[#FF6F4C] hover:bg-[#e5603f] text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-base">
          <Phone className="h-4 w-4" />Enquire Now
        </button>
      </div>

      {/* ─── MOBILE BOTTOM SHEET ─── */}
      {mobileFormOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFormOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="px-4 pb-6 pt-2">
              <EnquiryForm />
            </div>
          </div>
        </div>
      )}

      {/* ─── LIGHTBOX ─── */}
      {lightboxImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxImg(null)}>
          <button className="absolute top-4 right-4 text-white"><X className="h-6 w-6" /></button>
          <img src={lightboxImg} alt="Gallery" className="max-w-full max-h-[90vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
};

/* ─── Pill component ─── */
const Pill = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-gray-700">
    {icon}{label}
  </div>
);

export default LandingPage;
