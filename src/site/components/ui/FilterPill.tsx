import { motion } from "framer-motion";
import { cn } from "@/site/lib/utils";

interface FilterPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function FilterPill({ label, active, onClick, onRemove, className }: FilterPillProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 font-body text-sm font-medium px-4 py-2 rounded-sm border-2 transition-all duration-200 flex-shrink-0",
        active
          ? "bg-blaze border-blaze text-white shadow-sm"
          : "bg-white border-dashed border-ink/25 text-ink/70 hover:border-blaze/60 hover:text-blaze hover:scale-[1.03]",
        className
      )}
    >
      {label}
      {active && onRemove && (
        <span
          role="button"
          aria-label={`Remove ${label} filter`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 transition-colors"
        >
          <svg className="w-2.5 h-2.5"  viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </span>
      )}
    </motion.button>
  );
}
