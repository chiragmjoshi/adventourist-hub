import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface UnsavedBadgeProps {
  isDirty: boolean;
  lastSavedAt?: Date | null;
  className?: string;
}

const UnsavedBadge = ({ isDirty, lastSavedAt, className }: UnsavedBadgeProps) => {
  if (isDirty) {
    return (
      <Badge variant="outline" className={cn("border-blaze/40 bg-blaze/10 text-blaze gap-1.5", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-blaze animate-pulse" />
        Unsaved changes
      </Badge>
    );
  }
  if (lastSavedAt) {
    return (
      <Badge variant="outline" className={cn("border-ridge/30 bg-ridge/10 text-ridge gap-1.5", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-ridge" />
        Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}
      </Badge>
    );
  }
  return null;
};

export default UnsavedBadge;