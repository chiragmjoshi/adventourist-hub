import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/site/layout/Navbar";
import Footer from "@/site/layout/Footer";
import WhatsAppFAB from "@/site/layout/WhatsAppFAB";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
}

export default function SiteLayout({ children, title, description }: Props) {
  const { pathname } = useLocation();

  // Set document title + meta description per page (lightweight, no react-helmet dep)
  useEffect(() => {
    if (title) document.title = title;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [title, description]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
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