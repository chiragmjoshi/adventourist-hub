import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Extra classes merged into the wrapper div. */
  className?: string;
  /**
   * Round the corners + draw a 1px border. Default true. Set false when
   * the table already sits inside a card and the double border looks
   * heavy.
   */
  framed?: boolean;
}

/**
 * Phase 4C.2 — scrollable container for data tables.
 *
 * Replaces the two patterns scattered across the admin pages:
 *   <div className="border border-border/40 rounded-lg overflow-hidden"> …
 *   <Card className="…overflow-hidden"> …
 *
 * Both of those CLIP wide tables on screens narrower than the table — the
 * right-most columns disappear with no scroll bar. This wrapper swaps to
 * `overflow-x-auto` so the table scrolls horizontally within its card
 * instead of the whole page scrolling (which breaks the sticky sidebar on
 * admin pages).
 *
 * A richer per-row card-view fallback for mobile (<md) ships in a later
 * phase once we know which columns matter most for each list.
 */
export default function TableWrapper({ children, className, framed = true }: Props) {
  const base = framed
    ? "border border-border/40 rounded-lg overflow-x-auto"
    : "overflow-x-auto";
  const cls = [base, className].filter(Boolean).join(" ");
  return <div className={cls}>{children}</div>;
}
