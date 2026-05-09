import { useEffect, useState } from "react";
import SiteLayout from "@/site/SiteLayout";
import HeroSection from "@/site/sections/HeroSection";
import BrandValues from "@/site/sections/BrandValues";
import DestinationsGrid from "@/site/sections/DestinationsGrid";
import HowItWorks from "@/site/sections/HowItWorks";
import FeaturedItineraries from "@/site/sections/FeaturedItineraries";
import TestimonialsSection from "@/site/sections/TestimonialsSection";
import TravelStoriesSection from "@/site/sections/TravelStoriesSection";
import WhatsAppCTABanner from "@/site/sections/WhatsAppCTABanner";
import HomepageModal from "@/site/sections/HomepageModal";
import { getItineraries, getMasterData, type CMSItinerary, type CMSDestination } from "@/site/lib/api";

const HOME_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: "Adventourist",
    url: "https://adventourist.in/",
    logo: "https://adventourist.in/logo/logo-square-color.svg",
    image: "https://adventourist.in/site-images/bg-home-page.jpg",
    description: "Premium experiential travel from Mumbai. Personalised itineraries, real experts, zero booking fees.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Mumbai",
      addressRegion: "Maharashtra",
      addressCountry: "IN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+91-99304-00694",
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "250",
    },
    sameAs: [
      "https://instagram.com/adventourist.in",
      "https://facebook.com/adventourist",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Adventourist",
    url: "https://adventourist.in/",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://adventourist.in/trips?destination={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
];

export default function Home() {
  const [trips, setTrips] = useState<CMSItinerary[]>([]);
  const [destinations, setDestinations] = useState<CMSDestination[]>([]);

  useEffect(() => {
    getItineraries().then((d) => d && setTrips(d));
    getMasterData().then((d) => d?.destinations && setDestinations(d.destinations));
  }, []);

  return (
    <SiteLayout
      title="Adventourist — Travel Designed For You"
      description="Premium experiential travel from Mumbai. Personalised itineraries to Bali, Ladakh, Thailand, Sri Lanka & more. Zero booking fees. 4.8★ on Google."
      keywords="travel agency Mumbai, Bali honeymoon, Ladakh trips, Thailand packages, Sri Lanka tours, custom itineraries, Adventourist"
      jsonLd={HOME_JSONLD}
    >
      <HeroSection />
      <BrandValues />
      <DestinationsGrid apiDestinations={destinations} apiTrips={trips} />
      <HowItWorks />
      <FeaturedItineraries apiTrips={trips} apiDestinations={destinations} />
      <TestimonialsSection />
      <TravelStoriesSection />
      <WhatsAppCTABanner />
      <HomepageModal />
    </SiteLayout>
  );
}