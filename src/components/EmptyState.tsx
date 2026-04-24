import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaIcon?: LucideIcon;
  className?: string;
  children?: ReactNode;
}

const EmptyState = ({
  icon: Icon = Inbox, title, description, ctaLabel, onCta, ctaIcon: CtaIcon, className, children,
}: EmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center py-16 px-6",
      className,
    )}>
      <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      )}
      {ctaLabel && onCta && (
        <Button onClick={onCta}>
          {CtaIcon && <CtaIcon className="h-4 w-4 mr-2" />}
          {ctaLabel}
        </Button>
      )}
      {children}
    </div>
  );
};

export default EmptyState;