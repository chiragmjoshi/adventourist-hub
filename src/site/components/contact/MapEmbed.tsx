import { useState, useEffect, useRef } from "react";

const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3769.4!2d72.8380!3d19.1075!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c9b888ae67fd%3A0x2!2sAdventourist%2C%201%20Madhav%20Kunj%2C%20Vile%20Parle%2C%20Mumbai!5e0!3m2!1sen!2sin!4v1";

const DIRECTIONS_URL =
  "https://maps.google.com/?q=1+Madhav+Kunj+South+Pond+Road+Vile+Parle+Mumbai+400056";

export default function MapEmbed() {
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div>
      {/* Location strip */}
      <div className="bg-abyss py-3 px-5 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="font-body text-[14px] text-white/80">
          📍 1, Madhav Kunj, South Pond Road, Vile Parle, Mumbai – 400056
        </p>
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-[14px] font-semibold text-blaze hover:text-blaze/80 transition-colors flex-shrink-0 min-h-[44px] flex items-center"
        >
          Get Directions →
        </a>
      </div>

      {/* Map container */}
      <div ref={mapRef} className="w-full h-[260px] sm:h-[400px] bg-drift">
        {mapLoaded ? (
          <iframe
            src={MAP_EMBED_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Adventourist office location — 1 Madhav Kunj, Vile Parle, Mumbai"
            aria-label="Google Maps showing Adventourist office in Vile Parle, Mumbai"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-body text-sm text-ink/40">
            📍 Loading map…
          </div>
        )}
      </div>
    </div>
  );
}
