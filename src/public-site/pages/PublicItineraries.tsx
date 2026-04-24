import { useEffect, useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import ItineraryCard from "../components/ItineraryCard";
import { api, type ItinerarySummary } from "../lib/api";

const PublicItineraries = ({ basePath = "/preview" }: { basePath?: string }) => {
  const [items, setItems] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.itineraries().then(setItems).finally(() => setLoading(false)); }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav basePath={basePath} />
      <header className="bg-muted py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Plan</p>
          <h1 className="text-4xl sm:text-5xl font-bold">All Itineraries</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">Hand-crafted journeys, ready to book or fully customisable.</p>
        </div>
      </header>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No itineraries published yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it) => <ItineraryCard key={it.id} it={it} basePath={basePath} />)}
          </div>
        )}
      </section>
      <PublicFooter />
    </div>
  );
};

export default PublicItineraries;