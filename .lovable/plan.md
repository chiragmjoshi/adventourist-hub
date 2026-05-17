## Cinematic About Us redesign

Replace `src/site/pages/About.tsx` with a new immersive page at the existing `/about-us` route. Wrap in current `SiteLayout` (keeps nav/footer) and add Lenis smooth scroll scoped to this page.

### Dependencies
- Add `lenis` (one new dep). `framer-motion` v12 and `lucide-react` already installed.

### File layout
- `src/site/pages/About.tsx` — page composition, Lenis init in `useEffect`, SEO `<title>`/meta.
- `src/site/components/about-v2/` — section components:
  - `HeroCinematic.tsx` — 100vh, looping background video (Pexels/Cloudinary placeholder) + dark gradient overlay, headline split into chars, staggered `clip-path: inset(100% 0 0 0)` → `inset(0)` reveal, slow-zoom `scale 1→1.08` over 12s, bouncing scroll cue.
  - `AdventouristWay.tsx` — off-white section, statement headline scrubbed `opacity 0.2→1` via `useScroll({ target, offset })` + `useTransform`. Three glassmorphism cards (`Handcrafted` `Sparkles`, `Honest Pricing` `BadgeIndianRupee`, `Zero Stress` `HeartHandshake`) staggered `whileInView` with spring.
  - `StoryTimeline.tsx` — two-column. Left column `sticky top-0 h-screen` showing title + image that cross-fades as the active milestone changes (driven by `useScroll` segment progress). Right column maps milestones (2018, 2019, 2024, Present). A 2px vertical rail with a `motion.div` scaleY tied to scroll progress in Adventourist gold/terracotta. Mobile: unstack to single column, drop sticky.
  - `TeamShowcase.tsx` — three oversized portrait cards. On hover: image `scale 1.05`, subtle 3D tilt via `useMotionValue` + `useTransform` on mouseX/Y (rotateX/rotateY ±6°), and a custom `motion.div` cursor reading "Explore" follows mouse within card bounds (positioned absolutely, hidden on touch). Members: Minal Joshi, Pinky Prajapati, Mukund Joshi with role labels.
  - `ReviewsMarquee.tsx` — two duplicated rows translating `-50%` via `motion.div` with infinite `repeat`, pause on hover by toggling `animationPlayState` (use `motion.div` `animate` + state). 12+ snippets, star icons.
  - `JourneyCTA.tsx` — massive headline "Let's Plan Your Next Journey.", large circular magnetic button. Magnetism: track mouseX/Y relative to button center, animate `x`/`y` springs (max ±18px), reset on leave. Footer reveal: outer section uses `position: sticky` reveal pattern (preceding section has higher z-index sliding up to expose the CTA underneath).

### Design tokens
- Local palette in component: `bg-[#0B0B0E]` (obsidian) for hero/CTA, `bg-[#F4EFE6]` (warm stone) for scroll section, accents `#C9A86B` (sand gold) and brand `#FF6F4C` (Blaze). Typography: import `Fraunces` (display serif) + keep Inter (body) via Google Fonts `<link>` in `index.html` (or `@import` in `index.css`).
- Negative space: generous `py-32 lg:py-48` between sections, max-width `max-w-7xl`.

### Animation rules
- All `whileInView` use `viewport={{ once: true, margin: "-100px" }}`.
- Respect `prefers-reduced-motion`: skip Lenis init + replace transforms with static styles when matched.
- All transforms GPU-friendly (`x/y/scale/opacity/clipPath`), no layout thrash.

### Responsive
- Hero text: `text-5xl sm:text-7xl lg:text-9xl`.
- Sticky timeline becomes stacked column < `lg`; tilt + custom cursor disabled on `pointer: coarse`.
- Marquee speed reduces on mobile.

### Out of scope
- No backend changes, no schema changes, no admin route changes. Existing `Team`, `Contact`, `Stories` pages untouched.

### Verification
- `/about-us` loads, animations fire, no console errors, Lighthouse a11y > 90, works on a 375px viewport.
