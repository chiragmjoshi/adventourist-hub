import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SiteLayout from "@/site/SiteLayout";
import {
  getAllTravelStories,
  travelStoryImage,
  type TravelStory,
  type TravelStoryCategory,
} from "@/site/lib/api";

const TABS: { label: string; value: "all" | TravelStoryCategory }[] = [
  { label: "All", value: "all" },
  { label: "Travel Stories", value: "travel-stories" },
  { label: "Things To Do", value: "things-to-do" },
  { label: "Destination Guides", value: "destination-guides" },
];

const CATEGORY_LABEL: Record<string, string> = {
  "travel-stories": "Travel Stories",
  "things-to-do": "Things To Do",
  "destination-guides": "Destination Guides",
};

const CATEGORY_BADGE: Record<string, string> = {
  "travel-stories": "bg-lagoon text-abyss",
  "things-to-do": "bg-blaze text-white",
  "destination-guides": "bg-horizon text-abyss",
};

function formatDate(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden">
          <div className="aspect-[4/3] bg-abyss/5 animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-3 w-20 bg-abyss/10 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-abyss/10 rounded animate-pulse" />
            <div className="h-3 w-full bg-abyss/5 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StoryCard({ s, index }: { s: TravelStory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (index % 6) * 0.05, duration: 0.45 }}
      className="group"
    >
      <Link
        to={`/travel-stories/${s.slug}`}
        className="block bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300 h-full"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={travelStoryImage(s)}
            alt={s.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
          <span
            className={`absolute top-3 left-3 inline-block px-2.5 py-1 rounded-full font-body text-[11px] font-semibold uppercase tracking-wide ${
              CATEGORY_BADGE[s.category] ?? "bg-white text-abyss"
            }`}
          >
            {CATEGORY_LABEL[s.category] ?? s.category}
          </span>
        </div>
        <div className="p-5">
          <h3 className="font-display font-bold text-abyss text-base lg:text-lg leading-snug line-clamp-2">
            {s.title}
          </h3>
          {s.excerpt && (
            <p className="font-body text-sm text-ink/60 mt-2 line-clamp-2">{s.excerpt}</p>
          )}
          <p className="font-body text-xs text-ink/40 mt-3">
            {s.author ?? "Adventourist"} · {s.read_time_minutes ?? 5} min read
            {s.published_at && <> · {formatDate(s.published_at)}</>}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function TravelStories() {
  const [stories, setStories] = useState<TravelStory[] | null>(null);
  const [tab, setTab] = useState<"all" | TravelStoryCategory>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAllTravelStories().then(setStories);
  }, []);

  const filtered = useMemo(() => {
    if (!stories) return [];
    const q = query.trim().toLowerCase();
    return stories.filter((s) => {
      if (tab !== "all" && s.category !== tab) return false;
      if (q && !s.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stories, tab, query]);

  return (
    <SiteLayout
      title="Travel Stories & Inspiration | Adventourist"
      description="Real travel stories, destination guides and trip inspiration from Adventourist. Bali honeymoons, Ladakh adventures, Thailand escapes, Sri Lanka getaways — told by real travellers."
    >
      <section className="bg-drift py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-label mb-3">Stories From The Road</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss">
            Travel <span className="text-blaze italic">Stories</span>
          </h1>
        </div>
      </section>

      <section className="bg-drift pb-16 lg:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => {
                const active = tab === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTab(t.value)}
                    className={`px-4 py-2 rounded-full font-body text-sm font-medium transition-colors ${
                      active ? "bg-blaze text-white" : "bg-white text-abyss hover:bg-blaze/10"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="lg:w-72">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stories…"
                className="w-full px-4 py-2.5 rounded-full bg-white border border-abyss/10 font-body text-sm text-abyss placeholder:text-ink/40 focus:outline-none focus:border-blaze"
              />
            </div>
          </div>

          {stories === null ? (
            <GridSkeleton />
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-body text-ink/60">
                No stories match your search — try a different filter or keyword.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filtered.map((s, i) => (
                <StoryCard key={s.id} s={s} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
