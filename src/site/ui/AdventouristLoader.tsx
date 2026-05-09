const icons = [
  { emoji: "☀️", bg: "bg-[#FF6F4C]", delay: "0ms",   label: "Hope" },
  { emoji: "⛰️", bg: "bg-[#64CBB9]", delay: "150ms", label: "Strength" },
  { emoji: "🌊", bg: "bg-[#1A1D2E]", delay: "300ms", label: "Freedom" },
  { emoji: "❤️", bg: "bg-[#FDC436]", delay: "450ms", label: "Love" },
];

const sizeMap = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };

export default function AdventouristLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-2" role="status" aria-label="Loading">
      {icons.map(({ emoji, bg, delay, label }) => (
        <div
          key={label}
          className={`${s} ${bg} rounded-lg flex items-center justify-center animate-bounce`}
          style={{ animationDelay: delay, animationDuration: "800ms" }}
          title={label}
        >
          <span className="text-lg select-none">{emoji}</span>
        </div>
      ))}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 bg-[#EEE5D5] flex flex-col items-center justify-center z-50">
      <AdventouristLoader size="lg" />
      <p className="font-body text-sm text-[#666] mt-6 animate-pulse">
        Planning your adventure...
      </p>
    </div>
  );
}
