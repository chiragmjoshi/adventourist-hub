import { useEffect, useState } from "react";
import SiteLayout from "@/site/SiteLayout";
import StoriesGrid from "@/site/sections/StoriesGrid";
import { getStories, type CMSStory } from "@/site/lib/api";

function GridSkeleton() {
  return (
    <section className="bg-drift py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden">
              <div className="aspect-[4/3] bg-abyss/5 animate-pulse" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-20 bg-abyss/10 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-abyss/10 rounded animate-pulse" />
                <div className="h-3 w-full bg-abyss/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function TravelStories() {
  const [stories, setStories] = useState<CMSStory[] | null>(null);

  useEffect(() => {
    getStories().then((s) => setStories(s));
  }, []);

  return (
    <SiteLayout
      title="Travel Stories & Inspiration | Adventourist"
      description="Travel stories, tips and inspiration from real Adventourist trips."
    >
      <section className="bg-drift py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-label mb-3">Stories From The Road</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss">
            Travel <span className="text-blaze italic">Stories</span>
          </h1>
        </div>
      </section>
      {stories === null ? <GridSkeleton /> : <StoriesGrid stories={stories} />}
    </SiteLayout>
  );
}
