import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getCMSImageUrl, type CMSStory } from "@/site/lib/api";

const CATEGORIES = [
  "All",
  "Destination Guide",
  "Travel Tips",
  "Client Story",
  "Food & Culture",
  "Adventure",
  "Honeymoon",
] as const;

interface Props {
  stories: CMSStory[];
}

function StoryCard({ s, index }: { s: CMSStory; index: number }) {
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
        className="block bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={getCMSImageUrl(s.cover_image_url)}
            alt={s.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        </div>
        <div className="p-5">
          <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-horizon">
            {s.category}
          </span>
          <h3 className="font-display font-bold text-abyss text-base lg:text-lg leading-snug mt-2 line-clamp-2">
            {s.title}
          </h3>
          {s.excerpt && (
            <p className="font-body text-sm text-ink/60 mt-2 line-clamp-2">{s.excerpt}</p>
          )}
          <p className="font-body text-xs text-ink/40 mt-3">
            {s.author} · {s.read_time_minutes} min read
          </p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function StoriesGrid({ stories }: Props) {
  const [active, setActive] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(
    () => (active === "All" ? stories : stories.filter((s) => s.category === active)),
    [stories, active],
  );

  return (
    <section className="bg-drift py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {CATEGORIES.map((c) => {
            const isActive = c === active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`px-4 py-2 rounded-full font-body text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blaze text-white"
                    : "bg-white text-abyss hover:bg-blaze/10"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-body text-ink/60">No stories yet in this category — check back soon.</p>
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
  );
}
