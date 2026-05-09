import { useEffect, useRef } from "react";

export function TimelineEntry({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="
        motion-safe:opacity-0 motion-safe:translate-x-[-16px]
        motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out
        motion-safe:[&.is-visible]:opacity-100 motion-safe:[&.is-visible]:translate-x-0
      "
    >
      {children}
    </div>
  );
}
