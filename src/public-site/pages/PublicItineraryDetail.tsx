import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Calendar, IndianRupee, Check, X, ChevronDown } from "lucide-react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import EnquiryForm from "../components/EnquiryForm";
import { api, type Itinerary } from "../lib/api";

const fmtINR = (n?: number | null) => (n == null ? "" : new Intl.NumberFormat("en-IN").format(n));

const PublicItineraryDetail = ({ basePath = "/preview" }: { basePath?: string }) => {
  const { slug } = useParams<{ slug: string }>();
  const [it, setIt] = useState<Itinerary | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    api.itinerary(slug).then(setIt).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!it) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Itinerary not found</div>;

  const days = it.itinerary_days ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav basePath={basePath} />

      <section className="relative h-[60vh] min-h-[420px] flex items-end">
        {it.hero_image && <img src={it.hero_image} alt={it.headline} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-12 text-primary-foreground">
          {it.destination && <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">{it.destination.name}</p>}
          <h1 className="text-3xl sm:text-5xl font-bold max-w-3xl">{it.headline}</h1>
          <div className="flex flex-wrap gap-5 mt-5 text-sm">
            {it.days != null && <span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{it.days} Days / {it.nights ?? Math.max(0, it.days - 1)} Nights</span>}
            {it.price_per_person != null && <span className="flex items-center gap-2"><IndianRupee className="h-4 w-4" />₹{fmtINR(it.price_per_person)} per person</span>}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-12">
          {it.about && (
            <section>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Overview</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">About this trip</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{it.about}</p>
            </section>
          )}

          {days.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Day-by-Day</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Itinerary</h2>
              <div className="space-y-3">
                {days.map((day, idx) => (
                  <div key={idx} className="border border-border rounded-xl overflow-hidden bg-card">
                    <button onClick={() => setOpenDay(openDay === idx ? null : idx)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-primary font-bold text-sm w-16 shrink-0">Day {idx + 1}</span>
                        <span className="font-semibold text-sm">{day.title || `Day ${idx + 1}`}</span>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openDay === idx ? "rotate-180" : ""}`} />
                    </button>
                    {openDay === idx && day.description && (
                      <div className="px-4 pb-4 pt-0 border-t border-border">
                        <p className="text-sm text-muted-foreground leading-relaxed pl-[76px]">{day.description}</p>
                        {day.accommodation && <p className="text-xs text-muted-foreground pl-[76px] mt-2">🏨 {day.accommodation}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {(it.inclusions || it.exclusions) && (
            <section>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">What's Included</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Inclusions & Exclusions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {it.inclusions && (
                  <div className="bg-accent/10 rounded-xl p-6 border border-accent/20">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Check className="h-4 w-4 text-accent" /> Inclusions</h3>
                    <ul className="space-y-2">
                      {it.inclusions.split("\n").filter(Boolean).map((line, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />{line.replace(/^[-•]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {it.exclusions && (
                  <div className="bg-destructive/5 rounded-xl p-6 border border-destructive/20">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><X className="h-4 w-4 text-destructive" /> Exclusions</h3>
                    <ul className="space-y-2">
                      {it.exclusions.split("\n").filter(Boolean).map((line, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />{line.replace(/^[-•]\s*/, "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {it.gallery && it.gallery.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Gallery</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Moments</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                {it.gallery.map((url, i) => (
                  <img key={i} src={url} loading="lazy" alt="" className="w-full rounded-xl break-inside-avoid" />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <EnquiryForm title="Book this trip" subtitle="Talk to a travel expert today." itinerary_id={it.id} destination_id={it.destination?.id} source={`itinerary:${it.slug}`} />
        </aside>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PublicItineraryDetail;