import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "isomorphic-dompurify";
import { Share2, Link2, ChevronRight } from "lucide-react";
import SiteLayout from "@/site/SiteLayout";
import { useToast } from "@/hooks/use-toast";
import {
  getStoryBySlug,
  getStories,
  getCMSImageUrl,
  type CMSStory,
} from "@/site/lib/api";

type FullStory = Awaited<ReturnType<typeof getStoryBySlug>>;

function formatMonthYear(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function StorySkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4">
      <div className="h-8 w-3/4 bg-abyss/10 rounded animate-pulse" />
      <div className="h-4 w-1/2 bg-abyss/10 rounded animate-pulse" />
      <div className="h-[55vh] bg-abyss/5 rounded-2xl animate-pulse" />
      <div className="space-y-3 pt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full bg-abyss/5 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <SiteLayout title="Story not found | Adventourist">
      <section className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <h1 className="font-display font-black text-4xl text-abyss mb-3">Story not found</h1>
        <p className="font-body text-ink/60 mb-6">
          The story you’re looking for doesn’t exist or hasn’t been published yet.
        </p>
        <Link
          to="/travel-stories"
          className="inline-block bg-blaze text-white px-6 py-3 rounded-full font-body text-sm font-semibold hover:bg-blaze/90 transition-colors"
        >
          Browse all stories
        </Link>
      </section>
    </SiteLayout>
  );
}

export default function StoryDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [story, setStory] = useState<FullStory | undefined>(undefined);
  const [related, setRelated] = useState<CMSStory[]>([]);

  useEffect(() => {
    if (!slug) return;
    setStory(undefined);
    getStoryBySlug(slug).then(setStory);
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!story) return;
    getStories().then((all) => {
      const sameCat = all.filter(
        (s) => s.slug !== story.slug && s.category === story.category,
      );
      const fallback = all.filter((s) => s.slug !== story.slug);
      const pick = (sameCat.length >= 3 ? sameCat : [...sameCat, ...fallback]).slice(0, 3);
      setRelated(pick);
    });
  }, [story]);

  const cleanHtml = useMemo(
    () => (story?.content ? DOMPurify.sanitize(story.content) : ""),
    [story?.content],
  );

  if (story === undefined) {
    return (
      <SiteLayout title="Loading… | Adventourist">
        <StorySkeleton />
      </SiteLayout>
    );
  }
  if (story === null) return <NotFound />;

  const cover = getCMSImageUrl(story.cover_image_url);
  const og = story.og_image_url ? getCMSImageUrl(story.og_image_url) : cover;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${story.title} — Adventourist`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: story.title,
    description: story.seo_description ?? story.excerpt ?? undefined,
    image: og,
    author: { "@type": "Person", name: story.author },
    datePublished: story.published_at ?? undefined,
    publisher: {
      "@type": "Organization",
      name: "Adventourist",
      logo: { "@type": "ImageObject", url: "https://adventourist.in/logo.png" },
    },
  };

  return (
    <SiteLayout
      title={story.seo_title ?? `${story.title} | Adventourist`}
      description={story.seo_description ?? story.excerpt ?? undefined}
      ogImage={og}
      ogType="article"
      jsonLd={jsonLd}
    >
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[360px] w-full overflow-hidden">
        <img
          src={cover}
          alt={story.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/30 to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-10 lg:pb-14">
          <nav
            aria-label="Breadcrumb"
            className="font-body text-xs text-white/70 flex items-center gap-1.5 mb-4 flex-wrap"
          >
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/travel-stories" className="hover:text-white">Stories</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-horizon">{story.category}</span>
          </nav>
          <h1 className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            {story.title}
          </h1>
          <p className="font-body text-white/80 text-sm mt-4">
            {story.author}
            {story.published_at && <> · {formatMonthYear(story.published_at)}</>}
            {story.read_time_minutes ? <> · {story.read_time_minutes} min read</> : null}
            {typeof story.views === "number" && story.views > 0 && (
              <> · {story.views.toLocaleString("en-IN")} views</>
            )}
          </p>
        </div>
      </section>

      {/* Article */}
      <article className="bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          {story.excerpt && (
            <p className="font-body text-lg lg:text-xl text-abyss/80 leading-relaxed mb-8 italic border-l-4 border-blaze pl-4">
              {story.excerpt}
            </p>
          )}
          {cleanHtml ? (
            <div
              className="story-prose"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          ) : (
            <p className="font-body text-ink/60">This story has no content yet.</p>
          )}

          {/* Destination CTA */}
          {story.destination?.name && (
            <div className="mt-10 bg-blaze text-white rounded-2xl p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-body text-xs uppercase tracking-widest text-white/70 mb-1">
                  Inspired?
                </p>
                <p className="font-display font-bold text-xl lg:text-2xl">
                  Planning a trip to {story.destination.name}?
                </p>
              </div>
              <Link
                to={`/trips?destination=${encodeURIComponent(story.destination.name)}`}
                className="inline-block bg-white text-blaze px-5 py-3 rounded-full font-body text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
              >
                View Trips
              </Link>
            </div>
          )}

          {/* Share */}
          <div className="mt-10 pt-6 border-t border-abyss/10 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full font-body text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Share2 className="w-4 h-4" /> Share on WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl).then(() =>
                  toast({ title: "Link copied", description: "Share it with anyone." }),
                );
              }}
              className="inline-flex items-center gap-2 bg-abyss text-white px-4 py-2 rounded-full font-body text-sm font-medium hover:bg-abyss/90 transition-colors"
            >
              <Link2 className="w-4 h-4" /> Copy Link
            </button>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-drift py-14 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display font-black text-2xl lg:text-3xl text-abyss mb-8">
              More <span className="text-blaze italic">Stories</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((s) => (
                <Link
                  key={s.id}
                  to={`/travel-stories/${s.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow duration-300"
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
                    <h3 className="font-display font-bold text-abyss text-base mt-2 line-clamp-2">
                      {s.title}
                    </h3>
                    <p className="font-body text-xs text-ink/40 mt-3">
                      {s.author} · {s.read_time_minutes} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
