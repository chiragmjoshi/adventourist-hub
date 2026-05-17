import { MapPin, Phone, Mail } from "lucide-react";
import { PHONE_DISPLAY, PHONE_TEL } from "../shared";

export default function LandingFooter() {
  return (
    <footer className="bg-[#1A1D2E] text-white/80 pt-14 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-3 gap-10">
        <div>
          <div className="font-extrabold text-white text-xl tracking-tight">Adventourist</div>
          <p className="text-sm mt-3 max-w-xs text-white/60">
            Premium experiential travel from Mumbai. Hand-crafted trips, zero booking fees, 24/7 support.
          </p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 text-[#FF6F4C] shrink-0" />
            <span>1 Madhav Kunj, South Pond Road,<br />Vile Parle, Mumbai 400056</span>
          </div>
          <a href={PHONE_TEL} className="flex items-center gap-2 hover:text-white">
            <Phone className="h-4 w-4 text-[#FF6F4C]" />
            {PHONE_DISPLAY}
          </a>
          <a href="mailto:support@adventourist.in" className="flex items-center gap-2 hover:text-white">
            <Mail className="h-4 w-4 text-[#FF6F4C]" />
            support@adventourist.in
          </a>
          <p className="text-xs text-white/40 pt-1">GST: 27ABMFA3990N1ZQ</p>
        </div>
        <div className="text-sm space-y-2">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Useful Links</p>
          <a href="https://www.adventourist.in/privacy-policy" className="block hover:text-white">Privacy Policy</a>
          <a href="https://www.adventourist.in/terms-and-conditions" className="block hover:text-white">Terms & Conditions</a>
          <a href="https://www.adventourist.in/refund-and-cancellation-policy" className="block hover:text-white">Refund Policy</a>
          <a href="https://www.adventourist.in" className="block hover:text-white">adventourist.in</a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-white/10 text-xs text-white/40 text-center">
        © {new Date().getFullYear()} Adventourist. All rights reserved.
      </div>
    </footer>
  );
}