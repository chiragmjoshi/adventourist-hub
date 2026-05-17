## Goal

Switch the public Travel Stories surfaces from the legacy `stories` table + hardcoded dummies to the new `travel_stories` table (59 imported posts), and harden the routing/SEO/related-posts behaviour for the detail page.

## Scope

Only these four files are touched. Brand tokens, layout shell, and other sections stay untouched.

```text
src/site/lib/api.ts                      (add helpers for travel_stories)
src/site/sections/TravelStoriesSection.tsx
src/site/pages/TravelStories.tsx
src/site/pages/StoryDetail.tsx
```

`App.tsx` already wires `/travel-stories` and `/travel-stories/:slug` to `SiteTravelStories` and `SiteStoryDetail` — no router change needed.

## 1. API layer — new helpers in `src/site/lib/api.ts`

Add (do not delete the existing `getStories` / `getStoryBySlug` — admin StoryEdit/StoryList still use them):

```ts
export interface TravelStory {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_html: string | null;
  category: 'travel-stories' | 'things-to-do' | 'destination-guides';
  tags: string[] | null;
  author: string | null;
  thumbnail_url: string | null;
  read_time_minutes: number | null;
  views: number | null;
  status: string;
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  published_at: string | null;
}

const CATEGORY_FALLBACK: Record<string, string> = {
  'travel-stories':     '/site-images/search-images-8.jpg',
  'things-to-do':       '/site-images/dubai.jpg',
  'destination-guides': '/site-images/malaysia.jpg',
};

export function travelStoryImage(s: Pick<TravelStory,'thumbnail_url'|'category'>) {
  return s.thumbnail_url || CATEGORY_FALLBACK[s.category] || '/placeholder.svg';
}

// Top-viewed for homepage strip
export async function getTopTravelStories(limit = 4): Promise<TravelStory[]> { ... }

// Full list for /travel-stories
export async function getAllTravelStories(): Promise<TravelStory[]> { ... }

// Single + related (same category, exclude self, limit 3)
export async function getTravelStoryBySlug(slug: string): Promise<TravelStory | null> { ... }
export async function getRelatedTravelStories(category: string, excludeSlug: string, limit = 3): Promise<TravelStory[]> { ... }
```

All queries filter `status = 'published'`. Top uses `order('views', desc).limit(4)`. List uses `order('published_at', desc)`.

## 2. Homepage strip — `src/site/sections/TravelStoriesSection.tsx`

- Remove `FALLBACK_FEATURED`, `FALLBACK_SIDE`, `CardData`, `toCard`, and the `getStories` import.
- Fetch via `getTopTravelStories(4)`.
- `featured = data[0]`, `side = data[1..3]`.
- Card link → `/travel-stories/${slug}` (internal, no `external` flag needed).
- Image src → `travelStoryImage(story)`.
- Read time → `${read_time_minutes ?? 5} min read`.
- Empty/error state: render nothing (no fallback dummy data, since there are 59 real posts).
- Keep existing visual layout, motion, skeleton, and "Read all stories" link to `/travel-stories`.

## 3. List page — `src/site/pages/TravelStories.tsx` + rewrite `StoriesGrid`

Rather than touching `StoriesGrid` (which is still wired to old `CMSStory`), inline the new grid directly inside `TravelStories.tsx` to keep blast radius small and avoid breaking the old type.

New page contents:

- Hero block unchanged (same heading/eyebrow).
- Fetch `getAllTravelStories()` on mount.
- **Tabs:** `All | Travel Stories | Things To Do | Destination Guides` (pill buttons, active = `bg-blaze text-white`, idle = `bg-white text-abyss`). Map labels → category slugs.
- **Search:** controlled input, filters `title.toLowerCase().includes(query)`.
- **Grid:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8`.
- **Card:**
  - `aspect-[4/3]` thumbnail via `travelStoryImage`
  - Category badge (top-left over image) using colour map:
    - `travel-stories` → `bg-lagoon text-abyss`
    - `things-to-do` → `bg-blaze text-white`
    - `destination-guides` → `bg-horizon text-abyss`
  - Title (`line-clamp-2`), excerpt (`line-clamp-2`)
  - Meta row: `author · {read_time_minutes} min read · {publishedAt formatted}`
  - Full card wrapped in `<Link to={/travel-stories/${slug}}>`
- Empty state when filters yield 0 results.

`StoriesGrid.tsx` is left as-is (not imported anymore from this page) — safe because no other file references it.

## 4. Detail page — `src/site/pages/StoryDetail.tsx` rewrite

Swap data source from `getStoryBySlug` (old `stories` table) to `getTravelStoryBySlug` + `getRelatedTravelStories`.

Field mapping changes:

| Old field            | New field           |
|----------------------|---------------------|
| `cover_image_url`    | `thumbnail_url` (with category fallback via `travelStoryImage`) |
| `content`            | `content_html`      |
| `destination?.name`  | removed (no FK on `travel_stories`) |
| `og_image_url`       | use `thumbnail_url` |

Hero (full-bleed):
- `h-[55vh] min-h-[360px]` thumbnail
- Gradient overlay `from-abyss/90 via-abyss/30 to-transparent`
- Breadcrumb: Home › Stories › {prettyCategory}
- Category badge using the same colour map as the list page
- `<h1>` title
- Meta line: `{author} · {published_at month-year} · {read_time_minutes} min read · {views.toLocaleString()} views`

Body:
- `max-w-3xl mx-auto`, sanitize `content_html` with DOMPurify, render in a `.story-prose` container (already styled).
- Excerpt blockquote retained.

WhatsApp CTA banner (before footer, replaces the old destination CTA):
- Title: `Planning a trip? Talk to our experts` (no destination FK — fallback wording). If the focus_keyword exists, use `Planning a trip to {focus_keyword}? Talk to our experts`.
- Buttons: WhatsApp (`https://wa.me/<biz number>` from constants), and a secondary "Browse trips" → `/trips`.

Related:
- `getRelatedTravelStories(story.category, story.slug, 3)`.
- 3-up card grid, same card style as list page (compact variant — image + badge + title + meta).

SEO:
- `title` = `seo_title ?? \`${title} | Adventourist\``
- `description` = `seo_description ?? excerpt`
- `ogImage` = `travelStoryImage(story)`
- `ogType` = `'article'`
- JSON-LD `BlogPosting` with `headline`, `description`, `image`, `author`, `datePublished`.

Loading / not-found / share buttons preserved from current implementation.

## 5. Out of scope (explicitly NOT touched)

- `App.tsx` — routes already exist.
- `src/site/sections/StoriesGrid.tsx` — orphaned but not deleted to avoid surprise breakage.
- Admin `StoryList` / `StoryEdit` and the old `stories` table — still live, unrelated to the public-facing rollout.
- Brand tokens, nav, footer, fonts.

## Verification

- Type-check passes (auto by harness).
- Manually load `/`, scroll to Stories section → 4 real posts render, links go to `/travel-stories/<slug>`.
- `/travel-stories` shows 59 cards; tabs filter to 24 / 19 / 16; search narrows by title.
- `/travel-stories/<slug>` renders hero, sanitized HTML body, 3 related cards, WhatsApp CTA.
