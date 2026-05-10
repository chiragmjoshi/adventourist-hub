const stats = [
  { num: "250+", label: "Families Travelled" },
  { num: "4.8★", label: "Google Rating" },
  { num: "50+",  label: "Destinations" },
  { num: "₹0",   label: "Booking Fees" },
];

export default function HeroTrustStrip() {
  return (
    <section className="relative bg-abyss border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col items-center md:items-start ${
                i > 0 ? "md:border-l md:border-white/10 md:pl-6" : ""
              }`}
            >
              <p className="font-display font-black text-2xl sm:text-3xl text-horizon leading-none">
                {s.num}
              </p>
              <p className="font-body text-xs sm:text-sm text-white/60 mt-2 tracking-wide">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}