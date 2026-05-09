## Increase sidebar logo size

The expanded sidebar logo currently renders at `h-10` (40px), which is too small to read "ADVENTOURIST" clearly.

**Change in `src/components/AppSidebar.tsx` (line 78):**
- Expanded logo: `h-10 w-auto` → `h-16 w-auto` (64px)
- Also bump container vertical breathing room slightly so the larger logo doesn't feel cramped (`mb-6` stays, optionally `py-2` on the wrapper).

**Collapsed state (line 77):** keep `h-8` (icon-only sidebar is narrow, larger would overflow).

No other files touched.