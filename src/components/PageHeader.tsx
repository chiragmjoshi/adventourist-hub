import { ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

export interface PageHeaderBreadcrumb {
  /** Visible label. */
  label: ReactNode;
  /** If provided, the crumb renders as a link; otherwise it's static text. */
  to?: string;
  /** Override styling for the final (current) crumb. */
  variant?: "default" | "mono" | "accent";
}

interface Props {
  /**
   * The "back" link that sits before the first chevron. Omit to render no
   * back button (unusual).
   */
  back?: {
    to: string;
    label: ReactNode;
  };
  /**
   * Breadcrumb trail after the back link. The last entry is the current
   * page title and should usually be the only non-link crumb.
   */
  crumbs?: PageHeaderBreadcrumb[];
  /** Right-side actions (buttons / badges / dropdowns). */
  actions?: ReactNode;
  /** Optional className merged into the outer flex container. */
  className?: string;
}

/**
 * Shared page header: back arrow → breadcrumbs on the left, actions on the
 * right, with a thin bottom border. Replaces the hand-rolled copies in
 * LeadDetail / LandingPageDetail / TripCashflowDetail / VendorDetail (etc.)
 * so the chrome stays consistent as more pages adopt it in Phase 4C.
 */
export default function PageHeader({ back, crumbs, actions, className }: Props) {
  const navigate = useNavigate();
  const cls = ["flex items-center justify-between mb-5", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <nav className="flex items-center gap-2 text-sm" aria-label="Breadcrumb">
        {back && (
          <button
            type="button"
            onClick={() => navigate(back.to)}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {back.label}
          </button>
        )}
        {crumbs?.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            {c.to ? (
              <button
                type="button"
                onClick={() => navigate(c.to!)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {c.label}
              </button>
            ) : (
              <span
                className={
                  c.variant === "mono"
                    ? "font-mono font-semibold text-[hsl(var(--blaze))]"
                    : c.variant === "accent"
                    ? "font-semibold text-[hsl(var(--blaze))]"
                    : "font-medium"
                }
              >
                {c.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
