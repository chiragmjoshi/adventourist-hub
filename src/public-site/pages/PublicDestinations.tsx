import { useEffect, useState } from "react";
import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import DestinationCard from "../components/DestinationCard";
import { api, type Destination } from "../lib/api";

const PublicDestinations = ({ basePath = "/preview" }: { basePath?: string }) => {
  const [items, setItems] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.destinations().then(setItems).finally(() => setLoading(false)); }, []);

  return (
    <div className="min-h-screen bg-background">
      <PublicNav basePath={basePath} />
      <header className="bg-muted py-16 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Browse</p>
          <h1 className="text-4xl sm:text-5xl font-bold">All Destinations</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">From mountain monasteries to tropical lagoons — pick your next chapter.</p>
        </div>
      </header>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        {loading ? (
          <p className="text-muted-foreground text-center py-20">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-20">No destinations yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((d) => <DestinationCard key={d.id} d={d} basePath={basePath} />)}
          </div>
        )}
      </section>
      <PublicFooter />
    </div>
  );
};

export default PublicDestinations;