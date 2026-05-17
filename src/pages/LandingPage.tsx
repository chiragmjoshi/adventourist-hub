import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BoldTemplate from "@/landing/templates/BoldTemplate";
import MinimalTemplate from "@/landing/templates/MinimalTemplate";
import StoryTemplate from "@/landing/templates/StoryTemplate";
import { LandingPageData, ItineraryData } from "@/landing/shared";
import SEO from "@/components/SEO";

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";
  const templateOverride = searchParams.get("template");

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["public_landing_page", slug],
    queryFn: async () => {
      let q = supabase
        .from("landing_pages")
        .select(`
          *,
          destinations(
            id, name, about, hero_image,
            best_months, themes, suitable_for, testimonials
          )
        `)
        .eq("slug", slug!);
      if (!isPreview) q = q.eq("is_active", true);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as unknown as LandingPageData;
    },
  });

  const { data: itinerary } = useQuery({
    queryKey: ["public_itinerary", (page as any)?.itinerary_id],
    enabled: !!(page as any)?.itinerary_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("itineraries")
        .select(`
          headline, about,
          itinerary_days, inclusions, exclusions, highlights,
          hero_image, gallery,
          price_per_person, nights, days,
          flights_included, stay_included, transfers_included,
          meals_included, breakfast_included, sightseeing_included,
          support_247,
          best_months, suitable_for, themes, destination_type
        `)
        .eq("id", (page as any).itinerary_id!)
        .maybeSingle();
      return data as unknown as ItineraryData;
    },
  });

  // GTM only — SEO handled by <SEO /> component below
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).__gtmLoaded) {
      (window as any).__gtmLoaded = true;
      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      const gs = document.createElement("script");
      gs.async = true;
      gs.src = "https://www.googletagmanager.com/gtm.js?id=GTM-NDHCWP9";
      document.head.appendChild(gs);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-lg font-medium text-gray-400">Loading...</div>
      </div>
    );
  }
  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-gray-500">This page doesn't exist or has been deactivated.</p>
        <a href="https://www.adventourist.in" className="text-[#FF6F4C] hover:underline text-sm">
          Go to Adventourist →
        </a>
      </div>
    );
  }

  const tpl = (templateOverride || page.template_id || "bold") as string;

  const Body =
    tpl === "minimal" ? (
      <MinimalTemplate page={page} itinerary={itinerary} />
    ) : tpl === "story" ? (
      <StoryTemplate page={page} itinerary={itinerary} />
    ) : (
      <BoldTemplate page={page} itinerary={itinerary} />
    );

  return (
    <>
      {page && (
        <SEO
          title={(page as any).seo_title || page.hero_headline || page.name || "Adventourist"}
          description={(page as any).seo_description || page.hero_subtext || ""}
          canonical={`/l/${slug}`}
          ogImage={(page as any).hero_image}
          ogType="article"
          schema={[
            {
              "@context": "https://schema.org",
              "@type": "TouristTrip",
              name: page.hero_headline,
              description: page.hero_subtext,
              touristType: (page as any).suitable_for?.join?.(", "),
              offers: {
                "@type": "Offer",
                priceCurrency: "INR",
                seller: { "@type": "TravelAgency", name: "Adventourist" },
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.adventourist.in" },
                { "@type": "ListItem", position: 2, name: page.hero_headline, item: `https://www.adventourist.in/l/${slug}` },
              ],
            },
          ]}
        />
      )}
      {isPreview && (
        <div className="bg-yellow-400 text-yellow-900 text-center py-2 text-xs font-medium">
          ⚠️ Preview Mode — This page is not live yet
        </div>
      )}
      {Body}
    </>
  );
};

export default LandingPage;