import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { WHATSAPP_NUMBER } from "@/site/lib/constants";

const navLinks = [
  { label: "Home",    href: "/",              icon: "☀️" },
  { label: "Trips",   href: "/trips",         icon: "⛰️" },
  { label: "Stories", href: "/travel-stories",icon: "🌊" },
  { label: "About",   href: "/about-us",      icon: "❤️" },
  { label: "FAQs",    href: "/faqs",          icon: "❓" },
  { label: "Contact", href: "/contact",       icon: "✉️" },
];

export default function Navbar() {
  const [isOpen,   setIsOpen]   = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useLocation().pathname;
  const isHome = pathname === "/";
  const overlay = isHome && !scrolled;

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while menu is open
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, mounted]);

  return (
    <>
      {/* ── Fixed top nav bar ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          overlay
            ? "bg-transparent"
            : scrolled
              ? "bg-white shadow-md"
              : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">

            {/* Logo — vertically centered, sized to nav row */}
            <Link
              to="/"
              className="flex-shrink-0 flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-horizon rounded-sm"
              aria-label="Adventourist Home"
            >
              <img
                src="/logo/logo-horizontal-color.svg"
                alt="Adventourist — Travel Designed For You"
                width={320}
                height={88}
                className={`hidden md:block h-16 lg:h-20 w-auto ${overlay ? "hidden" : ""}`}
                fetchPriority="high"
                decoding="async"
              />
              {overlay && (
                <img
                  src="/logo/logo-horizontal-white.svg"
                  alt="Adventourist — Travel Designed For You"
                  width={320}
                  height={88}
                  className="hidden md:block h-16 lg:h-20 w-auto"
                  fetchPriority="high"
                  decoding="async"
                />
              )}
              <img
                src="/logo/logo-square-color.svg"
                alt="Adventourist"
                width={64}
                height={64}
                className="md:hidden h-14 w-auto"
                fetchPriority="high"
                decoding="async"
              />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden xl:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link key={link.href}
                  to={link.href}
                  className={`relative font-body text-base font-medium transition-colors duration-200 group ${
                    pathname === link.href
                      ? "text-blaze"
                      : overlay
                        ? "text-white hover:text-horizon"
                        : "text-ink hover:text-blaze"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-1 left-0 h-0.5 bg-blaze transition-all duration-300 ${
                      pathname === link.href ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden xl:block">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%27d%20like%20to%20talk%20to%20an%20expert.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blaze text-white text-sm font-semibold font-display px-5 py-3 rounded-full hover:bg-blaze/90 active:scale-[0.97] transition-all duration-200 shadow-sm"
              >
                Talk to an Expert →
              </a>
            </div>

            {/* Mobile hamburger — only shown on mobile */}
            <button
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
              className={`xl:hidden flex flex-col gap-1.5 p-2 rounded-md transition-colors ${overlay ? "hover:bg-white/10" : "hover:bg-drift/50"}`}
            >
              <span className={`block h-0.5 w-6 ${overlay ? "bg-white" : "bg-ink"}`} />
              <span className={`block h-0.5 w-6 ${overlay ? "bg-white" : "bg-ink"}`} />
              <span className={`block h-0.5 w-4 ${overlay ? "bg-white" : "bg-ink"}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile full-screen overlay — only after mount (prevents hydration mismatch) ── */}
      {mounted && (
        <div
          className={`fixed inset-0 z-[100] bg-horizon flex flex-col transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          {/* Header row */}
          <div className="flex items-center justify-between px-6 pt-5 pb-8">
            <img
              src="/logo/logo-horizontal-color.svg"
              alt="Adventourist"
              width={160}
              height={36}
              className="h-9 w-auto"
              decoding="async"
            />
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
              className="w-10 h-10 flex items-center justify-center text-abyss hover:text-blaze transition-colors"
            >
              <svg className="w-7 h-7"  viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 flex flex-col gap-1 px-6">
            {navLinks.map((link) => (
              <Link key={link.href}
                to={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 py-4 text-abyss text-3xl font-bold font-display border-b border-abyss/10 hover:text-blaze transition-colors"
              >
                <span className="text-2xl" aria-hidden="true">{link.icon}</span>{link.label}
              </Link>
            ))}
          </nav>

          {/* WhatsApp CTA */}
          <div className="px-6 pb-10 pt-6">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi!%20I%27m%20planning%20a%20trip.%20Can%20you%20help%3F`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-3 w-full py-4 rounded-full bg-blaze text-white font-display font-bold text-lg"
            >
              💬 Chat on WhatsApp
            </a>
            <p className="text-center text-abyss/50 text-sm mt-3 font-body">
              Mon–Sat · 9am–9pm IST · 2hr response
            </p>
          </div>
        </div>
      )}
    </>
  );
}
