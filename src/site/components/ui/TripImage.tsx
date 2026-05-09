import { useState } from "react";
import { getCMSImageUrl } from "@/site/lib/api";

const DESTINATION_GRADIENTS: Record<string, string> = {
  "Rajasthan":        "from-[#C84B31] to-[#FDC436]",
  "Himachal Pradesh": "from-[#FF6F4C] to-[#64CBB9]",
  "Uttarakhand":      "from-[#FF6F4C] to-[#1A1D2E]",
  "North East India": "from-[#FF6F4C] to-[#FDC436]",
  "Bali":             "from-[#FF6F4C] to-[#FDC436]",
  "Thailand":         "from-[#FDC436] to-[#1A1D2E]",
  "Sri Lanka":        "from-[#64CBB9] to-[#FDC436]",
  "Singapore":        "from-[#1A1D2E] to-[#FF6F4C]",
  "Leh Ladakh":       "from-[#1A1D2E] to-[#64CBB9]",
  "Vietnam":          "from-[#C84B31] to-[#FDC436]",
  "Seychelles":       "from-[#64CBB9] to-[#FDC436]",
  "Azerbaijan":       "from-[#1A1D2E] to-[#64CBB9]",
};
const DEFAULT_GRADIENT = "from-[#FF6F4C] to-[#FDC436]";

interface TripImageProps {
  path?: string | null;
  alt: string;
  destination?: string; ?: boolean;
  className?: string;
  sizes?: string; ?: boolean;
}

export default function TripImage({
  path, alt, destination, , className, sizes, ,
}: TripImageProps) {
  const [error, setError] = useState(false);
  const gradient = DESTINATION_GRADIENTS[destination ?? ""] ?? DEFAULT_GRADIENT;

  if (error || !path) {
    return (
      <div className={`bg-gradient-to-br ${gradient} flex items-center justify-center w-full h-full`}>
        <div className="relative w-16 h-16 opacity-20 select-none">
          <img             src="/site-images/advent-logo.svg"
            alt=""             className="object-contain"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }

  return (
    <img       src={getCMSImageUrl(path)}
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
    />
  );
}
