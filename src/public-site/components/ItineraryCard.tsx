import { Link } from "react-router-dom";
import { Calendar, IndianRupee } from "lucide-react";
import type { ItinerarySummary } from "../lib/api";

const fmtINR = (n?: number | null) =>
  n == null ? "" : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);

const ItineraryCard = ({ it, basePath = "/preview" }: { it: ItinerarySummary; basePath?: string }) => (
  <Link to={`${basePath}/itineraries/${it.slug}`} className="group block rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all">
    <div className="aspect-[16/10] overflow-hidden bg-muted">
      {it.hero_image ? (
        <img src={it.hero_image} alt={it.headline} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : null}
    </div>
    <div className="p-5">
      <h3 className="font-semibold text-base text-card-foreground group-hover:text-primary transition-colors line-clamp-2">{it.headline}</h3>
      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
        {it.days != null && (
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{it.days}D / {it.nights ?? Math.max(0, (it.days ?? 1) - 1)}N</span>
        )}
        {it.price_per_person != null && (
          <span className="flex items-center gap-1.5 font-semibold text-foreground"><IndianRupee className="h-3.5 w-3.5" />{fmtINR(it.price_per_person)} <span className="font-normal text-muted-foreground">/ person</span></span>
        )}
      </div>
    </div>
  </Link>
);

export default ItineraryCard;