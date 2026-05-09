import SiteLayout from "@/site/SiteLayout";
import TravelStoriesSection from "@/site/sections/TravelStoriesSection";

export default function TravelStories() {
  return (
    <SiteLayout title="Travel Stories & Inspiration | Adventourist" description="Travel stories, tips and inspiration from real Adventourist trips.">
      <section className="bg-drift py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-label mb-3">Stories From The Road</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss">Travel <span className="text-blaze italic">Stories</span></h1>
        </div>
      </section>
      <TravelStoriesSection />
    </SiteLayout>
  );
}