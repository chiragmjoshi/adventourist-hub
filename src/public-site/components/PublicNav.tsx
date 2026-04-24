import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const PublicNav = ({ basePath = "/preview" }: { basePath?: string }) => {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Destinations", to: `${basePath}/destinations` },
    { label: "Itineraries", to: `${basePath}/itineraries` },
    { label: "About", to: `${basePath}/about` },
    { label: "Contact", to: `${basePath}/contact` },
  ];
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link to={`${basePath}`} className="font-bold text-xl tracking-tight text-foreground">Adventourist</Link>
        <div className="hidden md:flex items-center gap-7">
          {links.map(l => (
            <Link key={l.to} to={l.to} className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">{l.label}</Link>
          ))}
          <Link to={`${basePath}/contact`} className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Plan My Trip</Link>
        </div>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-background border-t border-border py-3 px-4 space-y-2">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-primary py-2">{l.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default PublicNav;