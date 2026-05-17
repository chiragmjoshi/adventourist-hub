import { Phone, MessageCircle } from "lucide-react";
import { PHONE_TEL, WHATSAPP_URL } from "../shared";

export default function MobileStickyBar() {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 flex h-14 shadow-[0_-4px_12px_rgba(0,0,0,0.15)]">
      <a
        href={PHONE_TEL}
        className="flex-1 flex items-center justify-center gap-2 bg-[#1A1D2E] text-white font-semibold text-sm"
      >
        <Phone className="h-4 w-4" /> Call
      </a>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold text-sm"
      >
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
    </div>
  );
}