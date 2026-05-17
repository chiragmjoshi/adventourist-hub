import { Phone, MessageCircle } from "lucide-react";
import { PHONE_TEL, WHATSAPP_URL } from "../shared";

interface Props {
  variant?: "light" | "dark";
}

export default function LandingNavbar({ variant = "light" }: Props) {
  const isDark = variant === "dark";
  return (
    <nav
      className={`sticky top-0 z-50 backdrop-blur-md border-b h-14 flex items-center ${
        isDark
          ? "bg-[#1A1D2E]/95 border-white/10 text-white"
          : "bg-white/95 border-gray-100 text-[#1A1D2E]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
        <a href="https://www.adventourist.in" className="font-extrabold text-lg tracking-tight">
          Adventourist
        </a>
        <div className="flex items-center gap-2">
          <a
            href={PHONE_TEL}
            className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-full border transition-colors ${
              isDark
                ? "border-white/20 hover:bg-white/10"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Phone className="h-3.5 w-3.5" /> Call Us
          </a>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-full bg-[#25D366] text-white hover:bg-[#1ebe58] transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>
      </div>
    </nav>
  );
}