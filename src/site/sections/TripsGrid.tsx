import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/site/ui/Badge";
import TripImage from "@/site/ui/TripImage";
import { WHATSAPP_URL, DURATION_OPTIONS, BUDGET_OPTIONS } from "@/site/lib/constants";
import { waLink } from "@/site/lib/utils";
import { type CMSItinerary } from "@/site/lib/api";
import type { FilterState } from "@/site/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FILTERS: FilterState = {
  destination: "",
  duration: "",
  budget: "",
  themes: [],
  suitableFor: [],
};
const PER_PAGE = 9;
const SHOW_LIMIT = 8; // show N options before "show more"

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDays(s?: string): number {
  const m = s?.match(/(\d+)\s*[Dd]ay/);
  return m ? parseInt(m[1]) : 0;
}

function getTripThemes(trip: CMSItinerary): string[] {
  return (trip.destination?.types ?? []).map((t) => t.master_type.value);
}

function getTripSuitable(trip: CMSItinerary): string[] {
  return (trip.destination?.suitable_types ?? []).map((s) => s.master_type.value);
}

function applyFilters(trips: CMSItinerary[], f: FilterState): CMSItinerary[] {
  return trips.filter((t) => {
    if (f.destination && t.destination?.name !== f.destination) return false;

    if (f.duration) {
      const d = parseDays(t.days_and_nights);
      if (f.duration === "3-5"    && !(d >= 3  && d <= 5))  return false;
      if (f.duration === "6-8"    && !(d >= 6  && d <= 8))  return false;
      if (f.duration === "9-12"   && !(d >= 9  && d <= 12)) return false;
      if (f.duration === "13plus" && !(d >= 13))             return false;
    }

    if (f.budget) {
      const p = t.pricing_per_person ?? 0;
      if (f.budget === "under-30k" && !(p > 0 && p < 30000))        return false;
      if (f.budget === "30k-60k"   && !(p >= 30000 && p < 60000))   return false;
      if (f.budget === "60k-1l"    && !(p >= 60000 && p < 100000))  return false;
      if (f.budget === "above-1l"  && !(p >= 100000))                return false;
    }

    if (f.themes.length > 0) {
      const tripThemes = getTripThemes(t);
      if (!f.themes.some((ft) => tripThemes.includes(ft))) return false;
    }

    if (f.suitableFor.length > 0) {
      const tripSuitable = getTripSuitable(t);
      if (!f.suitableFor.some((sf) => tripSuitable.includes(sf))) return false;
    }

    return true;
  });
}

// ── Sidebar UI primitives ─────────────────────────────────────────────────────

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 group"
    >
      <span className="font-display font-bold text-xs text-ink/50 uppercase tracking-widest group-hover:text-abyss transition-colors">
        {title}
      </span>
      <svg
        className={`w-3.5 h-3.5 text-ink/30 transition-transform ${open ? "" : "-rotate-90"}`}  viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function RadioRow({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-all ${
        active ? "bg-blaze/8 text-blaze font-semibold" : "text-ink/65 hover:bg-drift hover:text-abyss"
      }`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
        active ? "border-blaze" : "border-ink/25"
      }`}>
        {active && <span className="w-2 h-2 rounded-full bg-blaze" />}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function CheckRow({
  label, checked, onToggle,
}: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-all ${
        checked ? "bg-blaze/8 text-blaze font-semibold" : "text-ink/65 hover:bg-drift hover:text-abyss"
      }`}
    >
      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? "border-blaze bg-blaze" : "border-ink/25"
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 text-white"  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

// ── Collapsible sidebar section ───────────────────────────────────────────────

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-ink/8 pb-3 mb-1 last:border-0">
      <SectionHeader title={title} open={open} onToggle={() => setOpen(!open)} />
      {open && <div className="mt-1 space-y-0.5">{children}</div>}
    </div>
  );
}

// ── Expandable list (show N then "show more") ─────────────────────────────────

function ExpandableList({ children, total }: { children: React.ReactNode[]; total: number }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? children : children.slice(0, SHOW_LIMIT);
  const hidden = total - SHOW_LIMIT;
  return (
    <>
      {visible}
      {!expanded && hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-blaze font-medium px-2 py-1 hover:underline"
        >
          + {hidden} more
        </button>
      )}
      {expanded && total > SHOW_LIMIT && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-ink/40 font-medium px-2 py-1 hover:underline"
        >
          Show less
        </button>
      )}
    </>
  );
}

// ── Sidebar filter sections ───────────────────────────────────────────────────

interface FilterOptions {
  destinations: string[];
  themes: string[];
  suitableFor: string[];
}

function SidebarSections({
  filters,
  onChange,
  options,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  options: FilterOptions;
}) {
  const set = (key: keyof FilterState, val: string) =>
    onChange({ ...filters, [key]: filters[key] === val ? "" : val });

  const toggle = (key: "themes" | "suitableFor", val: string) => {
    const curr = filters[key] as string[];
    onChange({
      ...filters,
      [key]: curr.includes(val) ? curr.filter((x) => x !== val) : [...curr, val],
    });
  };

  return (
    <div>
      {/* Destination */}
      {options.destinations.length > 0 && (
        <FilterSection title="Destination">
          <ExpandableList total={options.destinations.length}>
            {options.destinations.map((d) => (
              <RadioRow
                key={d}
                label={d}
                active={filters.destination === d}
                onClick={() => set("destination", d)}
              />
            ))}
          </ExpandableList>
        </FilterSection>
      )}

      {/* Duration */}
      <FilterSection title="Duration">
        {DURATION_OPTIONS.map((opt) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            active={filters.duration === opt.value}
            onClick={() => set("duration", opt.value)}
          />
        ))}
      </FilterSection>

      {/* Budget */}
      <FilterSection title="Budget (per person)">
        {BUDGET_OPTIONS.map((opt) => (
          <RadioRow
            key={opt.value}
            label={opt.label}
            active={filters.budget === opt.value}
            onClick={() => set("budget", opt.value)}
          />
        ))}
      </FilterSection>

      {/* Theme */}
      {options.themes.length > 0 && (
        <FilterSection title="Theme">
          <ExpandableList total={options.themes.length}>
            {options.themes.map((t) => (
              <CheckRow
                key={t}
                label={t}
                checked={filters.themes.includes(t)}
                onToggle={() => toggle("themes", t)}
              />
            ))}
          </ExpandableList>
        </FilterSection>
      )}

      {/* Suitable For */}
      {options.suitableFor.length > 0 && (
        <FilterSection title="Suitable For">
          {options.suitableFor.map((s) => (
            <CheckRow
              key={s}
              label={s}
              checked={filters.suitableFor.includes(s)}
              onToggle={() => toggle("suitableFor", s)}
            />
          ))}
        </FilterSection>
      )}
    </div>
  );
}

// ── Active filter chips ───────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-blaze/10 text-blaze text-xs font-semibold px-3 py-1.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-blaze/70 transition-colors" aria-label={`Remove ${label} filter`}>
        <svg className="w-3 h-3"  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function ActiveChips({
  filters,
  onChange,
  onClear,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClear: () => void;
}) {
  const destLabel = DURATION_OPTIONS.find((o) => o.value === filters.duration)?.label;
  const budgetLabel = BUDGET_OPTIONS.find((o) => o.value === filters.budget)?.label;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {filters.destination && (
        <Chip label={filters.destination} onRemove={() => onChange({ ...filters, destination: "" })} />
      )}
      {destLabel && (
        <Chip label={destLabel} onRemove={() => onChange({ ...filters, duration: "" })} />
      )}
      {budgetLabel && (
        <Chip label={budgetLabel} onRemove={() => onChange({ ...filters, budget: "" })} />
      )}
      {filters.themes.map((t) => (
        <Chip
          key={t}
          label={t}
          onRemove={() => onChange({ ...filters, themes: filters.themes.filter((x) => x !== t) })}
        />
      ))}
      {filters.suitableFor.map((s) => (
        <Chip
          key={s}
          label={s}
          onRemove={() => onChange({ ...filters, suitableFor: filters.suitableFor.filter((x) => x !== s) })}
        />
      ))}
      <button
        onClick={onClear}
        className="text-xs text-ink/40 hover:text-blaze transition-colors font-medium"
      >
        Clear all
      </button>
    </div>
  );
}

// ── Trip card ─────────────────────────────────────────────────────────────────

function ItineraryCard({ trip, index }: { trip: CMSItinerary; index: number }) {
  const imgPath = trip.thumbnail?.file_path ?? trip.pictures?.[0]?.file_path;
  const price   = trip.pricing_per_person
    ? `₹${trip.pricing_per_person.toLocaleString("en-IN")}`
    : "Price on request";
  const themes  = getTripThemes(trip).slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4, ease: "easeOut" }}
      className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-ink/6 transition-all duration-300 hover:-translate-y-1.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <TripImage
          path={imgPath}
          alt={`${trip.headline} — ${trip.destination?.name ?? ""} travel itinerary`}
          destination={trip.destination?.name}           className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss/85 via-abyss/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="font-display font-bold text-white text-xl leading-tight mb-1">{trip.headline}</h3>
          <p className="font-body text-white/70 text-sm">{trip.days_and_nights}</p>
        </div>
        {/* Theme pills on image */}
        {themes.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1">
            {themes.map((t) => (
              <span key={t} className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {trip.destination?.name && <Badge>{trip.destination.name}</Badge>}
        </div>
        <div className="mb-4">
          <p className="font-body text-xs text-ink/40 uppercase tracking-wide">From</p>
          <p className="font-display font-bold text-lg text-abyss">
            {price}<span className="text-sm font-normal text-ink/50">/person</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/trips/${trip.slug}`}
            className="flex-1 inline-flex items-center justify-center font-body text-sm font-semibold text-white bg-abyss hover:bg-abyss/90 rounded-lg py-2.5 px-3 transition-colors"
          >
            View Trip →
          </Link>
          <a
            href={waLink(trip.headline)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1 font-body text-sm font-semibold text-white bg-[#25D366] hover:bg-[#22c55e] rounded-lg py-2.5 px-3 transition-colors"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="col-span-full text-center py-20">
      <p className="text-6xl mb-4">🗺️</p>
      <h3 className="font-display font-bold text-2xl text-abyss mb-2">No trips match your search</h3>
      <p className="font-body text-ink/60 mb-6 max-w-sm mx-auto">
        Try adjusting your filters — or let our travel experts build a custom trip just for you.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onClear}
          className="inline-flex items-center justify-center bg-drift text-abyss font-display font-semibold px-6 py-3 rounded-full hover:bg-drift/80 transition-all"
        >
          Clear All Filters
        </button>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blaze text-white font-display font-semibold px-6 py-3 rounded-full hover:bg-blaze/90 active:scale-[0.97] transition-all"
        >
          Talk to a Travel Expert →
        </a>
      </div>
    </div>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────

function MobileDrawer({
  open,
  onClose,
  filters,
  onChange,
  options,
  resultCount,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  options: FilterOptions;
  resultCount: number;
  onClear: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            className="fixed top-0 left-0 bottom-0 z-50 bg-white lg:hidden w-80 max-w-[90vw] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-horizon shrink-0">
              <h3 className="font-display font-bold text-abyss text-lg">Filters</h3>
              <button onClick={onClose} className="text-abyss/70 hover:text-abyss p-1">
                <svg className="w-5 h-5"  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sections */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <SidebarSections filters={filters} onChange={onChange} options={options} />
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 pb-6 pt-3 border-t border-ink/8 flex gap-3">
              <button
                onClick={() => { onClear(); onClose(); }}
                className="flex-1 py-3 border-2 border-ink/20 rounded-full font-body text-sm font-semibold text-ink/60 hover:border-ink/40 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-blaze text-white rounded-full font-display font-semibold text-sm hover:bg-blaze/90 transition-colors"
              >
                Show {resultCount} Trips
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function TripsGrid({ itineraries }: { itineraries: CMSItinerary[] }) {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<FilterState>({
    ...EMPTY_FILTERS,
    destination: searchParams.get("destination") ?? "",
  });
  useEffect(() => {
    const d = searchParams.get("destination");
    if (d) setFilters((prev) => ({ ...prev, destination: d }));
  }, [searchParams]);
  const [page,    setPage]    = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Derive filter options from actual trip data — only shows values that exist
  const filterOptions = useMemo<FilterOptions>(() => {
    const unique = (arr: (string | undefined | null)[]): string[] =>
      [...new Set(arr.filter(Boolean) as string[])].sort();

    return {
      destinations: unique(itineraries.map((t) => t.destination?.name)),
      themes:       unique(itineraries.flatMap(getTripThemes)),
      suitableFor:  unique(itineraries.flatMap(getTripSuitable)),
    };
  }, [itineraries]);

  const filtered = useMemo(() => applyFilters(itineraries, filters), [itineraries, filters]);
  const visible  = useMemo(() => filtered.slice(0, page * PER_PAGE), [filtered, page]);
  const hasMore  = visible.length < filtered.length;

  const hasFilters =
    !!(filters.destination || filters.duration || filters.budget) ||
    filters.themes.length > 0 ||
    filters.suitableFor.length > 0;

  const activeCount =
    (filters.destination ? 1 : 0) +
    (filters.duration ? 1 : 0) +
    (filters.budget ? 1 : 0) +
    filters.themes.length +
    filters.suitableFor.length;

  const handleChange = (next: FilterState) => {
    setFilters(next);
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Mobile top bar ── */}
      <div className="lg:hidden sticky top-16 z-30 bg-white border-b border-ink/8 -mx-4 px-4 py-3 mb-6 flex items-center justify-between">
        <button
          onClick={() => setDrawerOpen(true)}
          className="inline-flex items-center gap-2 font-body text-sm font-semibold bg-drift px-4 py-2 rounded-full hover:bg-drift/70 transition-colors"
        >
          <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6" />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="bg-blaze text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {activeCount}
            </span>
          )}
        </button>
        <span className="font-body text-sm text-ink/50">
          {filtered.length} {filtered.length === 1 ? "trip" : "trips"}
        </span>
      </div>

      {/* ── Active filter chips ── */}
      {hasFilters && (
        <ActiveChips filters={filters} onChange={handleChange} onClear={clearFilters} />
      )}

      {/* ── Main layout: sidebar + grid ── */}
      <div className="flex gap-8 items-start">

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-28">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-base text-abyss">Filters</h2>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-ink/40 hover:text-blaze transition-colors font-medium"
                >
                  Clear all
                </button>
              )}
            </div>
            <SidebarSections filters={filters} onChange={handleChange} options={filterOptions} />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Result count (desktop) */}
          <p className="hidden lg:block font-body text-sm text-ink/40 mb-6">
            {filtered.length} {filtered.length === 1 ? "itinerary" : "itineraries"} found
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.length === 0
              ? <EmptyState onClear={clearFilters} />
              : visible.map((trip, i) => <ItineraryCard key={trip.id} trip={trip} index={i} />)
            }
          </div>

          {hasMore && (
            <div className="text-center mt-12">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-2 border-2 border-horizon text-abyss font-display font-semibold px-8 py-3.5 rounded-full hover:bg-horizon hover:text-abyss active:scale-[0.97] transition-all"
              >
                Load More Trips
                <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer (slides in from left) */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={handleChange}
        options={filterOptions}
        resultCount={filtered.length}
        onClear={clearFilters}
      />
    </div>
  );
}
