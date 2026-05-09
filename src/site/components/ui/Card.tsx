import { cn } from "@/site/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: "div" | "article" | "section";
}

export function Card({ children, className, hover = false, as: Tag = "div" }: CardProps) {
  return (
    <Tag
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-ink/6",
        hover && "transition-all duration-200 hover:-translate-y-1.5 hover:shadow-xl",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5 lg:p-6", className)}>{children}</div>;
}
