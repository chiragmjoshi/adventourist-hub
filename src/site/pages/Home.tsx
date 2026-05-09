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
      description="Premium experiential travel from Mumbai. Personalised itineraries to Bali, Ladakh, Thailand, Sri Lanka, Singapore, Vietnam, Seychelles and more. Zero booking fees."
    >
      <HeroSection />
      <BrandValues />
      <DestinationsGrid apiDestinations={destinations} />
      <HowItWorks />
      <FeaturedItineraries apiTrips={trips} />
      <TestimonialsSection />
      <TravelStoriesSection />
      <WhatsAppCTABanner />
      <HomepageModal />
    </SiteLayout>
  );
}