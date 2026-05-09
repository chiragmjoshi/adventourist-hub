import { useState, useEffect } from "react";
import PlanTripModal from "./PlanTripModal";

// Show the plan-a-trip modal after 45 seconds if the user is still on the page.
// Dismissed state persists in sessionStorage so it doesn't re-appear on refresh.
const SESSION_KEY = "adv_modal_dismissed";

export default function HomepageModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => setIsOpen(true), 45_000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  };

  return <PlanTripModal isOpen={isOpen} onClose={handleClose} />;
}
