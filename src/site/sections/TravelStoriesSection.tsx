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
  { category: "Food & Culture", title: "The Street Food Trail That Changed My Perspective on Vietnam", image: "/site-images/malaysia.jpg",      readTime: "4 min read", href: "https://blog.adventourist.in" },
  { category: "Honeymoon",      title: "We Planned Our Bali Honeymoon in 48 Hours — Here's How",       image: "/site-images/bg-home-page.jpg",  readTime: "5 min read", href: "https://blog.adventourist.in" },
  { category: "Travel Tips",    title: "The Only Seychelles Packing List You'll Ever Need",            image: "/site-images/dubai.jpg",         readTime: "3 min read", href: "https://blog.adventourist.in" },
];

export default function TravelStoriesSection() {
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
          <a href="https://blog.adventourist.in" target="_blank" rel="noopener noreferrer"
             className="font-body text-sm font-medium text-blaze hover:text-blaze/80 transition-colors flex items-center gap-1">
            Read all stories
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Featured */}
          <motion.a
            href={featured.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55 }}
            className="group relative overflow-hidden rounded-2xl min-h-[420px] lg:min-h-[560px] flex flex-col justify-end"
          >
            <img
              src={featured.image}
              alt={featured.title}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/30 to-transparent" />
            <div className="relative z-10 p-6 lg:p-8">
              <span className="inline-block font-body text-xs font-semibold uppercase tracking-widest text-horizon mb-3">
                {featured.category}
              </span>
              <h3 className="font-display font-black text-white text-2xl lg:text-3xl leading-tight mb-3">
                {featured.title}
              </h3>
              <p className="font-body text-white/70 text-sm leading-relaxed mb-4 hidden lg:block">
                {featured.excerpt}
              </p>
              <p className="font-body text-white/50 text-xs">{featured.readTime}</p>
            </div>
          </motion.a>

          {/* Side cards */}
          <div className="flex flex-col gap-5">
            {stories.map((s, i) => (
              <motion.a
                key={s.title}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="group flex gap-4 bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300"
              >
                <div className="relative w-32 flex-shrink-0">
                  <img
                    src={s.image}
                    alt={s.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.08]"
                  />
                </div>
                <div className="flex flex-col justify-center py-4 pr-4 min-w-0">
                  <span className="font-body text-[11px] font-semibold uppercase tracking-widest text-horizon mb-1.5">
                    {s.category}
                  </span>
                  <h3 className="font-display font-bold text-abyss text-sm lg:text-base leading-snug line-clamp-2">
                    {s.title}
                  </h3>
                  <p className="font-body text-xs text-ink/40 mt-2">{s.readTime}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
