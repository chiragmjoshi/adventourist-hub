import { Link } from "react-router-dom";
import { cn } from "@/site/lib/utils";

interface LogoProps {
  variant?: "color" | "white";
  className?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

const dimensions = {
  sm: { h: 28, w: 112 },
  md: { h: 36, w: 144 },
  lg: { h: 48, w: 192 },
};

export default function Logo({ variant = "color", className, href = "/", size = "md" }: LogoProps) {
  const { h, w } = dimensions[size];

  const inner = (
    <span className={cn("flex items-center flex-shrink-0", className)}>
      <img         src="/site-images/advent-logo.svg"
        alt="Adventourist"
        width={w}
        height={h}
        style={{ height: h, width: "auto", ...(variant === "white" ? { filter: "brightness(0) invert(1)" } : {}) }}       />
    </span>
  );

  if (!href) return inner;
  return (
    <Link to={href} className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blaze focus-visible:ring-offset-2 rounded-sm">
      {inner}
    </Link>
  );
}
