import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";

const PublicAbout = ({ basePath = "/preview" }: { basePath?: string }) => (
  <div className="min-h-screen bg-background">
    <PublicNav basePath={basePath} />
    <header className="bg-muted py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">About Us</p>
        <h1 className="text-4xl sm:text-5xl font-bold">We're a small team obsessed with great trips.</h1>
        <p className="text-muted-foreground mt-5 text-lg">Adventourist designs personalised journeys for travellers who care about the details — and who'd rather have a real human on the other end of the phone than a chatbot.</p>
      </div>
    </header>
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 prose prose-neutral max-w-none">
      <h2 className="text-2xl font-bold mb-4">Our promise</h2>
      <p className="text-muted-foreground leading-relaxed">Every itinerary is hand-crafted. Every booking is double-checked. Every traveller gets a dedicated expert from enquiry to return. No call centres, no scripts, no surprises.</p>
    </section>
    <PublicFooter />
  </div>
);

export default PublicAbout;