import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const featured = {
  category: "Adventure",
  title:    "11 Reasons Why Leh Ladakh Should Be on Every Indian's Bucket List",
  excerpt:  "From the surreal Pangong Lake to the ancient monasteries of Thiksey — Ladakh is not just a destination, it's a transformation.",
  image:    "/site-images/search-images-8.jpg",
  href:     "https://blog.adventourist.in",
  readTime: "6 min read",
};

const stories = [
  {
    category: "Food & Culture",
    title:    "The Street Food Trail That Changed My Perspective on Vietnam",
    image:    "/site-images/malaysia.jpg",
    readTime: "4 min read",
    href:     "https://blog.adventourist.in",
  },
  {
    category: "Honeymoon",
    title:    "We Planned Our Bali Honeymoon in 48 Hours — Here's How",
    image:    "/site-images/bg-home-page.jpg",
    readTime: "5 min read",
    href:     "https://blog.adventourist.in",
  },
  {
    category: "Travel Tips",
    title:    "The Only Seychelles Packing List You'll Ever Need",
    image:    "/site-images/dubai.jpg",
    readTime: "3 min read",
    href:     "https://blog.adventourist.in",
  },
];

export default function TravelStoriesSection() {
  return (
    <section className="bg-drift py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p className="section-label mb-3">Stories & Inspiration</p>
            <h2 className="font-display font-black text-4xl lg:text-5xl text-abyss">
              Travel <span className="text-blaze italic">Stories</span>
            </h2>
          </div>
          <a
            href="https://blog.adventourist.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1 flex-shrink-0"
          >
            Read all stories
            <svg className="w-4 h-4"  viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>

        {/* Magazine layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Featured (left, tall) */}
          <motion.a
            href={featured.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group relative overflow-hidden rounded-2xl min-h-[420px] lg:min-h-[560px] flex flex-col justify-end"
          >
            <img               src={featured.image}
              alt={featured.title}               className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/30 to-transparent" />
            <div className="relative z-10 p-6 lg:p-8">
              <span className="inline-block font-body text-xs font-semibold uppercase tracking-widest text-horizon mb-3">
                {featured.category}
              </span>
              <h3 className="font-display font-black text-white text-2xl lg:text-3xl leading-tight mb-3">
                {featured.title}
              </h3>
              <p className="font-body text-white/60 text-sm leading-relaxed mb-4 hidden lg:block">
                {featured.excerpt}
              </p>
              <p className="font-body text-white/40 text-xs">{featured.readTime}</p>
            </div>
          </motion.a>

          {/* 3 stacked cards (right) */}
          <div className="flex flex-col gap-5">
            {stories.map((story, i) => (
              <motion.a
                key={story.title}
                href={story.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group flex gap-4 bg-white rounded-2xl overflow-hidden p-0 hover:shadow-md transition-shadow duration-300"
              >
                <div className="relative w-28 flex-shrink-0 overflow-hidden">
                  <img                     src={story.image}
                    alt={story.title}                     className="object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                  />
                </div>
                <div className="flex flex-col justify-center py-4 pr-4">
                  <span className="font-body text-xs font-semibold uppercase tracking-widest text-horizon mb-1.5">
                    {story.category}
                  </span>
                  <h3 className="font-display font-bold text-abyss text-sm lg:text-base leading-snug line-clamp-2">
                    {story.title}
                  </h3>
                  <p className="font-body text-xs text-ink/40 mt-2">{story.readTime}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
