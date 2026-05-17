import { useEffect } from "react";
import Lenis from "lenis";
import SiteLayout from "@/site/SiteLayout";
import SEO from "@/components/SEO";
import HeroCinematic from "@/site/components/about-v2/HeroCinematic";
import AdventouristWay from "@/site/components/about-v2/AdventouristWay";
import StoryTimeline from "@/site/components/about-v2/StoryTimeline";
import TeamShowcase from "@/site/components/about-v2/TeamShowcase";
import ReviewsMarquee from "@/site/components/about-v2/ReviewsMarquee";
import JourneyCTA from "@/site/components/about-v2/JourneyCTA";

export default function About() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return (
    <SiteLayout
      title="About Adventourist — We Design Journeys"
      description="Boutique Mumbai-based travel design studio. 250+ five-star reviews, handcrafted itineraries, honest pricing, and zero stress."
    >
      <SEO
        title="About Us — Adventourist | Mumbai's Premium Travel Company"
        description="We are Adventourist — a Mumbai-based team of passionate explorers crafting expert-led, custom travel experiences. Meet our founders and discover our travel philosophy."
        canonical="/about-us"
        schema={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: "https://www.adventourist.in/about-us",
          name: "About Adventourist",
          description: "Learn about Adventourist — Mumbai's premium experiential travel company founded by Chirag and Minal Joshi. Our story, values, and travel philosophy.",
          mainEntity: {
            "@type": "TravelAgency",
            "@id": "https://www.adventourist.in/#organization",
            name: "Adventourist",
            founder: [
              { "@type": "Person", name: "Chirag Joshi" },
              { "@type": "Person", name: "Minal Joshi" },
            ],
          },
        }}
      />
      <div className="bg-[#1A1D2E]">
        <HeroCinematic />
        <AdventouristWay />
        <StoryTimeline />
        <TeamShowcase />
        <ReviewsMarquee />
        <JourneyCTA />
      </div>
    </SiteLayout>
  );
}