/**
 * Phase 4C.3 — "Skip to main content" link.
 *
 * Hidden by default, becomes visible on keyboard focus. Lets keyboard-only
 * users bypass the sidebar + top bar on every admin page. WCAG 2.4.1.
 *
 * The target is `#main-content` which AppLayout adds to its <main>.
 */
export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-3 focus:left-3 focus:z-[100]
        focus:px-3 focus:py-2 focus:rounded-md
        focus:bg-[hsl(var(--blaze))] focus:text-white
        focus:shadow-lg focus:outline-none
        focus:ring-2 focus:ring-offset-2 focus:ring-[hsl(var(--blaze))]
        text-sm font-medium
      "
    >
      Skip to main content
    </a>
  );
}
