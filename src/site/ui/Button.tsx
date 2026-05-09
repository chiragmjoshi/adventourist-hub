import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type Variant = "primary" | "secondary" | "ghost" | "whatsapp";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  href?: string;
  children: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold rounded-full transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:   "bg-blaze text-white hover:bg-blaze/90 shadow-sm",
  secondary: "border-2 border-horizon text-abyss hover:bg-horizon hover:text-abyss",
  ghost:     "text-blaze underline-offset-4 hover:underline bg-transparent",
  whatsapp:  "bg-[#25D366] text-white hover:bg-[#22c55e]",
};

const sizes: Record<Size, string> = {
  sm: "text-xs px-4 py-2",
  md: "text-sm px-5 py-2.5",
  lg: "text-base px-7 py-3.5",
};

export function Button({
  variant = "primary",
  size    = "md",
  className,
  children,
  href,
  ...props
}: ButtonProps) {
  const classes = twMerge(clsx(base, variants[variant], sizes[size], className));

  if (href) {
    return (
      <a href={href} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
