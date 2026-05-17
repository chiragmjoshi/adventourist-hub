import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { getTopTravelStories, travelStoryImage, type TravelStory } from "@/site/lib/api";

const CATEGORY_LABEL: Record<string, string> = {
  "travel-stories": "Travel Stories",
  "things-to-do": "Things To Do",
  "destination-guides": "Destination Guides",
};

function readTime(s: TravelStory) {
  return `${s.read_time_minutes ?? 5} min read`;
}

function FeaturedSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="rounded-2xl bg-abyss/5 animate-pulse min-h-[420px] lg:min-h-[560px]" />
      <div className="flex flex-col gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 bg-white rounded-2xl overflow-hidden h-[120px]">
            <div className="w-32 bg-abyss/5 animate-pulse" />
            <div className="flex-1 p-4 space-y-2">
              <div className="h-3 w-20 bg-abyss/10 rounded animate-pulse" />
              <div className="h-4 w-3/4 bg-abyss/10 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-abyss/5 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TravelStoriesSection() {
  const [stories, setStories] = useState<TravelStory[] | null>(null);

  useEffect(() => {
    getTopTravelStories(4).then(setStories);
  }, []);

  const featured = stories && stories.length > 0 ? stories[0] : null;
  const side = stories ? stories.slice(1, 4) : [];

  return (
    <section className="bg-drift py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55 }}
        >
          <div>
            <p className="section-label mb-3">Stories &amp; Inspiration</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Travel <span className="text-blaze italic">Stories</span>
            </h2>
          </div>
          <Link
            to="/travel-stories"
            className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1"
          >
            Read all stories
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </motion.div>

        {stories === null ? (
          <FeaturedSkeleton />
        ) : featured ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Featured */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55 }}
              className="group relative overflow-hidden rounded-2xl min-h-[420px] lg:min-h-[560px] flex flex-col justify-end"
            >
              <Link to={`/travel-stories/${featured.slug}`} className="absolute inset-0 z-20" aria-label={featured.title} />
              <img
                src={travelStoryImage(featured)}
                alt={featured.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/30 to-transparent" />
              <div className="relative z-10 p-6 lg:p-8">
                <span className="inline-block font-body text-xs font-semibold uppercase tracking-widest text-horizon mb-3">
                  {CATEGORY_LABEL[featured.category] ?? featured.category}
                </span>
                <h3 className="font-display font-black text-white text-2xl lg:text-3xl leading-tight mb-3">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="font-body text-white/70 text-sm leading-relaxed mb-4 hidden lg:block line-clamp-3">
                    {featured.excerpt}
                  </p>
                )}
                <p className="font-body text-white/50 text-xs">{readTime(featured)}</p>
              </div>
            </motion.div>

            {/* Side cards */}
            <div className="flex flex-col gap-5">
              {side.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="group relative flex gap-4 bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300"
                >
                  <Link to={`/travel-stories/${s.slug}`} className="absolute inset-0 z-20" aria-label={s.title} />
                  <div className="relative w-32 flex-shrink-0">
                    <img
                      src={travelStoryImage(s)}
                      alt={s.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                    />
                  </div>
                  <div className="flex flex-col justify-center py-4 pr-4 min-w-0">
                    <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-horizon mb-1.5">
                      {CATEGORY_LABEL[s.category] ?? s.category}
                    </span>
                    <h3 className="font-display font-bold text-abyss text-sm lg:text-base leading-snug line-clamp-2">
                      {s.title}
                    </h3>
                    <p className="font-body text-xs text-ink/40 mt-2">{readTime(s)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
