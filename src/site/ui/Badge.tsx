import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type BadgeVariant = "default" | "blaze" | "horizon" | "ridge" | "lagoon" | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-drift text-ink/70",
  blaze:   "bg-blaze text-white",
  horizon: "bg-horizon text-ink",
  ridge:   "bg-horizon text-abyss",
  lagoon:  "bg-lagoon text-abyss",
  outline: "border border-current text-current bg-transparent stamp-border",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center font-body text-xs font-medium px-2.5 py-1 rounded-sm",
          variants[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
}
