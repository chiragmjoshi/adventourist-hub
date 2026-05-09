import SiteLayout from "@/site/SiteLayout";
import FAQAccordion from "@/site/components/contact/FAQAccordion";

export default function FAQs() {
  return (
    <SiteLayout title="FAQs | Adventourist" description="Frequently asked questions about planning a trip with Adventourist.">
      <section className="bg-drift topo-texture py-16 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="section-label mb-3">Questions, Answered</p>
          <h1 className="font-display font-black text-4xl lg:text-5xl text-abyss">Frequently Asked <span className="text-blaze italic">Questions</span></h1>
        </div>
      </section>
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FAQAccordion />
        </div>
      </section>
    </SiteLayout>
  );
}