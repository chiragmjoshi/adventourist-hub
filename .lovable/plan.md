## Goal
Recolor the "How It Works" section from Lagoon teal to Horizon yellow (#FDC436), keeping the layout, copy, and animations exactly as they are.

## Change (single file: `src/site/sections/HowItWorks.tsx`)

- Section background: `bg-lagoon` → `bg-horizon` (topo texture stays).
- Text: keep Abyss (#1A1D2E) family — it already reads well on yellow. Bump the muted tones slightly for contrast on the lighter background:
  - Eyebrow "HOW IT WORKS": `text-abyss/50` → `text-abyss/60`
  - Body copy: `text-abyss/70` → `text-abyss/75`
  - Icons: `text-abyss/60` → `text-abyss/70`
  - Dashed connector: `border-abyss/25` → `border-abyss/30`
- Accent in the headline stays Blaze (`text-blaze`) — on yellow this reads as brand, not clash.
- Number circles stay Abyss with white numerals; their ring changes `ring-lagoon` → `ring-horizon` so it keeps blending into the new background.
- CTA button unchanged (Abyss pill, white text).

## Not touching
No other section, no design tokens, no Tailwind config changes — `horizon` is already defined.

## Verify
Screenshot the section in the preview to confirm contrast and that the ring/connector still blend correctly.
