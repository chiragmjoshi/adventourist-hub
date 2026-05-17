import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/site/layout/Navbar";
import Footer from "@/site/layout/Footer";
import WhatsAppFAB from "@/site/layout/WhatsAppFAB";

const SITE_ORIGIN = "https://adventourist.in";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/site-images/bg-home-page.jpg`;

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  /** Optional JSON-LD structured data object (will be stringified). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function SiteLayout({
  children,
  title,
  description,
  keywords,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  jsonLd,
}: Props) {
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

  // Set page-level <head> tags
  useEffect(() => {
    const finalTitle = title ?? "Adventourist — Travel Designed For You";
    const finalDesc =
      description ??
      "Premium experiential travel from Mumbai. Personalised itineraries to Bali, Ladakh, Thailand, Sri Lanka & more. Zero booking fees. 4.8★ on Google.";
    const canonical = `${SITE_ORIGIN}${pathname}`;

    document.title = finalTitle;
    upsertMeta('meta[name="description"]', "name", "description", finalDesc);
    if (keywords) upsertMeta('meta[name="keywords"]', "name", "keywords", keywords);

    // Open Graph
    upsertMeta('meta[property="og:title"]',       "property", "og:title",       finalTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", finalDesc);
    upsertMeta('meta[property="og:type"]',        "property", "og:type",        ogType);
    upsertMeta('meta[property="og:url"]',         "property", "og:url",         canonical);
    upsertMeta('meta[property="og:image"]',       "property", "og:image",       ogImage);
    upsertMeta('meta[property="og:site_name"]',   "property", "og:site_name",   "Adventourist");

    // Twitter
    upsertMeta('meta[name="twitter:card"]',        "name", "twitter:card",        "summary_large_image");
    upsertMeta('meta[name="twitter:title"]',       "name", "twitter:title",       finalTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", finalDesc);
    upsertMeta('meta[name="twitter:image"]',       "name", "twitter:image",       ogImage);

    // Canonical
    upsertLink("canonical", canonical);

    // JSON-LD — replace any previous block we owned
    const existing = document.head.querySelectorAll('script[data-seo="adventourist-jsonld"]');
    existing.forEach((n) => n.remove());
    const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
    blocks.forEach((b) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo", "adventourist-jsonld");
      s.text = JSON.stringify(b);
      document.head.appendChild(s);
    });
  }, [title, description, keywords, ogImage, ogType, jsonLd, pathname]);

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
    <div className="site-root min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-20">{children}</main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
}