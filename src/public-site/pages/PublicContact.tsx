import PublicNav from "../components/PublicNav";
import PublicFooter from "../components/PublicFooter";
import EnquiryForm from "../components/EnquiryForm";
import { Phone, Mail, MapPin } from "lucide-react";

const PublicContact = ({ basePath = "/preview" }: { basePath?: string }) => (
  <div className="min-h-screen bg-background">
    <PublicNav basePath={basePath} />
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid lg:grid-cols-2 gap-12">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Get in touch</p>
        <h1 className="text-4xl sm:text-5xl font-bold">Talk to a travel expert.</h1>
        <p className="text-muted-foreground mt-4 text-lg">Tell us where you're dreaming of. We'll come back with a plan, a price, and a real human on call.</p>
        <div className="mt-10 space-y-5 text-sm">
          <div className="flex items-center gap-4"><Phone className="h-5 w-5 text-primary" /> +91 99999 99999</div>
          <div className="flex items-center gap-4"><Mail className="h-5 w-5 text-primary" /> hello@adventourist.in</div>
          <div className="flex items-center gap-4"><MapPin className="h-5 w-5 text-primary" /> Vile Parle, Mumbai 400056</div>
        </div>
      </div>
      <EnquiryForm source="contact_page" />
    </section>
    <PublicFooter />
  </div>
);

export default PublicContact;