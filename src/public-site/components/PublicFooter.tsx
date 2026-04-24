const PublicFooter = () => (
  <footer className="bg-sidebar text-sidebar-foreground py-12 mt-20">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-8">
      <div>
        <h3 className="font-bold text-lg mb-3">Adventourist</h3>
        <p className="text-sm opacity-70">Curated journeys, expert-led, hassle-free.</p>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Explore</h4>
        <ul className="space-y-2 text-sm">
          <li><a href="/destinations" className="hover:text-primary">Destinations</a></li>
          <li><a href="/itineraries" className="hover:text-primary">Itineraries</a></li>
          <li><a href="/about" className="hover:text-primary">About</a></li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Contact</h4>
        <ul className="space-y-2 text-sm opacity-80">
          <li>+91 99999 99999</li>
          <li>hello@adventourist.in</li>
          <li>Mumbai, India</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider opacity-60">Legal</h4>
        <ul className="space-y-2 text-sm opacity-80">
          <li><a href="/privacy" className="hover:text-primary">Privacy</a></li>
          <li><a href="/terms" className="hover:text-primary">Terms</a></li>
        </ul>
      </div>
    </div>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 pt-6 border-t border-sidebar-border text-xs opacity-60">
      © {new Date().getFullYear()} Adventourist. All rights reserved.
    </div>
  </footer>
);

export default PublicFooter;