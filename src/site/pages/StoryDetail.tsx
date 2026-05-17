import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DOMPurify from "isomorphic-dompurify";
import { Share2, Link2, ChevronRight, MessageCircle } from "lucide-react";
import SiteLayout from "@/site/SiteLayout";
import { useToast } from "@/hooks/use-toast";
import {
  getTravelStoryBySlug,
  getRelatedTravelStories,
  travelStoryImage,
  type TravelStory,
} from "@/site/lib/api";
import { WHATSAPP_URL } from "@/site/lib/constants";

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

function formatMonthYear(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "long", year: "numeric" });
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
  const [story, setStory] = useState<TravelStory | null | undefined>(undefined);
  const [related, setRelated] = useState<TravelStory[]>([]);

  useEffect(() => {
    if (!slug) return;
    setStory(undefined);
    getTravelStoryBySlug(slug).then(setStory);
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!story) return;
    getRelatedTravelStories(story.category, story.slug, 3).then(setRelated);
  }, [story]);

  const cleanHtml = useMemo(
    () => (story?.content_html ? DOMPurify.sanitize(story.content_html) : ""),
    [story?.content_html],
  );

  if (story === undefined) {
    return (
      <SiteLayout title="Loading… | Adventourist">
        <StorySkeleton />
      </SiteLayout>
    );
  }
  if (story === null) return <NotFound />;

  const cover = travelStoryImage(story);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${story.title} — Adventourist`;
  const ctaSubject = story.focus_keyword?.trim();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: story.title,
    description: story.seo_description ?? story.excerpt ?? undefined,
    image: cover,
    author: { "@type": "Person", name: story.author ?? "Adventourist" },
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
      ogImage={cover}
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
            <span className="text-horizon">{CATEGORY_LABEL[story.category] ?? story.category}</span>
          </nav>
          <span
            className={`inline-block self-start px-2.5 py-1 rounded-full font-body text-[11px] font-semibold uppercase tracking-wide mb-3 ${
              CATEGORY_BADGE[story.category] ?? "bg-white text-abyss"
            }`}
          >
            {CATEGORY_LABEL[story.category] ?? story.category}
          </span>
          <h1 className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl leading-tight">
            {story.title}
          </h1>
          <p className="font-body text-white/80 text-sm mt-4">
            {story.author ?? "Adventourist"}
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

      {/* WhatsApp CTA Banner */}
      <section className="bg-blaze">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <p className="font-body text-xs uppercase tracking-widest text-white/70 mb-2">
              Inspired?
            </p>
            <h2 className="font-display font-black text-white text-2xl lg:text-3xl leading-tight">
              {ctaSubject
                ? `Planning a trip to ${ctaSubject}? Talk to our experts`
                : "Planning a trip? Talk to our experts"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-blaze px-5 py-3 rounded-full font-body text-sm font-semibold hover:bg-white/90 transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" /> Chat on WhatsApp
            </a>
            <Link
              to="/trips"
              className="inline-flex items-center gap-2 border border-white/40 text-white px-5 py-3 rounded-full font-body text-sm font-semibold hover:bg-white/10 transition-colors whitespace-nowrap"
            >
              Browse Trips
            </Link>
          </div>
        </div>
      </section>

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
                    <h3 className="font-display font-bold text-abyss text-base mt-1 line-clamp-2">
                      {s.title}
                    </h3>
                    <p className="font-body text-xs text-ink/40 mt-3">
                      {s.author ?? "Adventourist"} · {s.read_time_minutes ?? 5} min read
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
