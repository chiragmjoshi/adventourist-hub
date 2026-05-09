import { useState } from "react";
import { motion } from "framer-motion";

const destinations = [
  "All Trips", "Bali", "Leh Ladakh", "Thailand", "Sri Lanka",
  "Singapore", "Vietnam", "Seychelles", "Himachal", "Uttarakhand",
  "Azerbaijan", "North East", "Dubai",
];

export default function DestinationStrip() {
  const [active, setActive] = useState("All Trips");

  return (
    <section className="bg-white border-y border-ink/8 py-5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Scrollable pill row */}
        <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {destinations.map((dest, i) => (
            <motion.button
              key={dest}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActive(dest)}
              className={`flex-shrink-0 font-body text-sm font-medium px-4 py-2 rounded-sm border-2 transition-all duration-200 ${
                active === dest
                  ? "bg-blaze border-blaze text-white"
                  : "bg-white border-dashed border-ink/20 text-ink/70 hover:border-blaze/50 hover:text-blaze"
              }`}
            >
              {dest}
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
