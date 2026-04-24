import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressProps {
  steps: { key: string; label: string }[];
  current: string;
  completed?: string[];
  onJump?: (key: string) => void;
  className?: string;
}

/**
 * Numbered/check-mark dot row for multi-tab forms.
 * - Filled dot = current step
 * - Check dot = completed
 * - Outline dot = future
 */
const StepProgress = ({ steps, current, completed = [], onJump, className }: StepProgressProps) => {
  return (
    <div className={cn("flex items-center gap-2 w-full overflow-x-auto py-2", className)}>
      {steps.map((step, idx) => {
        const isCurrent = step.key === current;
        const isDone = completed.includes(step.key);
        const clickable = !!onJump;
        return (
          <div key={step.key} className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onJump?.(step.key)}
              className={cn(
                "flex items-center gap-2 group",
                clickable && "cursor-pointer",
                !clickable && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  isCurrent && "bg-primary text-primary-foreground border-primary",
                  !isCurrent && isDone && "bg-ridge text-white border-ridge",
                  !isCurrent && !isDone && "bg-background text-muted-foreground border-border",
                  clickable && !isCurrent && "group-hover:border-primary group-hover:text-primary",
                )}
              >
                {isDone && !isCurrent ? <Check className="h-3.5 w-3.5" /> : idx + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  isCurrent ? "text-foreground" : "text-muted-foreground",
                  clickable && "group-hover:text-foreground",
                )}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className={cn("h-px w-6 sm:w-10", isDone ? "bg-ridge" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepProgress;