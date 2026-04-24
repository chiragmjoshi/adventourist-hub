import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import ItineraryCard from "../components/ItineraryCard";
import EnquiryForm from "../components/EnquiryForm";
import { api, type Destination } from "../lib/api";

const PublicDestinationDetail = ({ basePath = "/preview" }: { basePath?: string }) => {
  const { slug } = useParams<{ slug: string }>();
  const [d, setD] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.destination(slug).then(setD).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (error || !d) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Destination not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <PublicNav basePath={basePath} />

      <section className="relative h-[60vh] min-h-[400px] flex items-end">
        {d.hero_image && <img src={d.hero_image} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-12 text-primary-foreground">
          {d.themes && d.themes.length > 0 && (
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">{d.themes.slice(0, 3).join(" · ")}</p>
          )}
          <h1 className="text-4xl sm:text-6xl font-bold">{d.name}</h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-[1fr_360px] gap-10">
        <div>
          {d.about && (
            <section className="mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">About</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Why {d.name}</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{d.about}</p>
            </section>
          )}

          {d.itineraries && d.itineraries.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Trips</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">Itineraries in {d.name}</h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {d.itineraries.map((it) => <ItineraryCard key={it.id} it={it} basePath={basePath} />)}
              </div>
            </section>
          )}

          {d.gallery && d.gallery.length > 0 && (
            <section className="mt-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Gallery</p>
              <h2 className="text-2xl sm:text-3xl font-bold mb-6">In pictures</h2>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
                {d.gallery.map((url, i) => (
                  <img key={i} src={url} loading="lazy" alt="" className="w-full rounded-xl break-inside-avoid" />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 self-start">
          <EnquiryForm title={`Plan ${d.name}`} subtitle="Free quote within 24 hours." destination_id={d.id} source={`destination:${d.slug}`} />
        </aside>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PublicDestinationDetail;