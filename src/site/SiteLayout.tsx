import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/site/layout/Navbar";
import Footer from "@/site/layout/Footer";
import WhatsAppFAB from "@/site/layout/WhatsAppFAB";

interface Props {
  children: ReactNode;
  /** @deprecated meta handled by <SEO /> component; kept for backward compat */
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function SiteLayout({ children }: Props) {
  const { pathname } = useLocation();

  // Google Tag Manager — public site only (never on /admin)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const GTM_ID = "GTM-NDHCWP9";
    if (!(window as any).__gtmLoaded) {
      (window as any).__gtmLoaded = true;
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
      document.head.appendChild(s);
      const ns = document.createElement("noscript");
      ns.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
      document.body.insertBefore(ns, document.body.firstChild);
    }
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  // Animation safety net — if framer-motion / observers haven't revealed an
  // element shortly after it enters the viewport, force it visible.
  useEffect(() => {
    const reveal = () => {
      const root = document.querySelector(".site-root");
      if (!root) return;
      const vh = window.innerHeight;
      root.querySelectorAll<HTMLElement>("*").forEach((el) => {
        const inline = el.style.opacity;
        if (inline === "" || parseFloat(inline) >= 0.95) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) {
          el.style.opacity = "1";
          el.style.transform = "none";
        }
      });
    };
    const t1 = window.setTimeout(reveal, 500);
    const onScroll = () => window.requestAnimationFrame(reveal);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(t1);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return (
    <div className="site-root min-h-screen flex flex-col bg-white overflow-x-hidden">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-20">{children}</main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
}