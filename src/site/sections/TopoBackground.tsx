import { cn } from "@/site/lib/utils";

interface TopoBackgroundProps {
  children?: React.ReactNode;
  className?: string;
  lineColor?: string;   // CSS color string e.g. "#ffffff"
  opacity?: number;     // 0–1
}

// Animated topographic contour line SVG — the brand's visual signature
export default function TopoBackground({
  children,
  className,
  lineColor = "#D4C9B5",
  opacity = 0.05,
}: TopoBackgroundProps) {
  const svgEncoded = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="500" height="500">
      <path d="M-50,40 C20,15 80,65 150,40 C220,15 280,65 350,40 C420,15 480,65 550,40" stroke="${lineColor}" stroke-width="1.2" />
      <path d="M-50,90 C20,65 80,115 150,90 C220,65 280,115 350,90 C420,65 480,115 550,90" stroke="${lineColor}" stroke-width="1.2" />
      <path d="M-50,140 C20,115 80,165 150,140 C220,115 280,165 350,140 C420,115 480,165 550,140" stroke="${lineColor}" stroke-width="1" />
      <path d="M-50,190 C20,165 80,215 150,190 C220,165 280,215 350,190 C420,165 480,215 550,190" stroke="${lineColor}" stroke-width="1" />
      <path d="M-50,240 C20,215 80,265 150,240 C220,215 280,265 350,240 C420,215 480,265 550,240" stroke="${lineColor}" stroke-width="0.9" />
      <path d="M-50,290 C20,265 80,315 150,290 C220,265 280,315 350,290 C420,265 480,315 550,290" stroke="${lineColor}" stroke-width="0.9" />
      <path d="M-50,340 C20,315 80,365 150,340 C220,315 280,365 350,340 C420,315 480,365 550,340" stroke="${lineColor}" stroke-width="0.8" />
      <path d="M-50,390 C20,365 80,415 150,390 C220,365 280,415 350,390 C420,365 480,415 550,390" stroke="${lineColor}" stroke-width="0.8" />
      <path d="M-50,440 C20,415 80,465 150,440 C220,415 280,465 350,440 C420,415 480,465 550,440" stroke="${lineColor}" stroke-width="0.7" />
      <path d="M-50,490 C20,465 80,515 150,490 C220,465 280,515 350,490 C420,465 480,515 550,490" stroke="${lineColor}" stroke-width="0.7" />
    </svg>
  `);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Topo SVG layer */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none z-0 animate-topo-drift"
        style={{
          backgroundImage: `url("data:image/svg+xml,${svgEncoded}")`,
          backgroundSize: "500px 500px",
          opacity,
          top: "-200px",
        }}
      />
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
