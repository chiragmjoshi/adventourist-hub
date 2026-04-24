import { Link } from "react-router-dom";
import type { Destination } from "../lib/api";

const DestinationCard = ({ d, basePath = "/preview" }: { d: Destination; basePath?: string }) => (
  <Link to={`${basePath}/destinations/${d.slug}`} className="group block rounded-2xl overflow-hidden bg-card border border-border hover:shadow-xl transition-all">
    <div className="aspect-[4/3] overflow-hidden bg-muted">
      {d.hero_image ? (
        <img src={d.hero_image} alt={d.name} loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
      )}
    </div>
    <div className="p-5">
      <h3 className="font-semibold text-lg text-card-foreground group-hover:text-primary transition-colors">{d.name}</h3>
      {d.themes && d.themes.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">{d.themes.slice(0, 3).join(" · ")}</p>
      )}
      <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{d.about ?? ""}</p>
    </div>
  </Link>
);

export default DestinationCard;