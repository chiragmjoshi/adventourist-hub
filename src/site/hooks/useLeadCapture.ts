import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  destination?: string;
  travel_month?: string;
  group_size?: string;
  budget?: string;
  message?: string;
  page_source?: string;
  /** Optional trip context — when the lead came from a specific itinerary card / detail page. */
  trip_title?: string;
  trip_slug?: string;
  trip_price?: string;
}

/**
 * Inserts a public website lead into the existing CMS `leads` table.
 * The CMS lead-management screen will pick these up automatically.
 */
export function useLeadCapture() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = async (d: LeadData) => {
    setLoading(true);
    setError(null);
    try {
      // Build notes blob with the public-form-only fields (group size, budget, month, etc.)
      const notesParts: string[] = [];
      if (d.trip_title) {
        notesParts.push(
          `Interested in: ${d.trip_title}${d.trip_slug ? ` (${d.trip_slug})` : ""}${d.trip_price ? ` — ${d.trip_price}` : ""}`
        );
      }
      if (d.destination)  notesParts.push(`Destination: ${d.destination}`);
      if (d.travel_month) notesParts.push(`Travel month: ${d.travel_month}`);
      if (d.group_size)   notesParts.push(`Group size: ${d.group_size}`);
      if (d.budget)       notesParts.push(`Budget: ${d.budget}`);
      if (d.message)      notesParts.push(`Message:\n${d.message}`);

      // Capture UTM + landing page context if available
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
          const v = params.get(k);
          if (v) notesParts.push(`${k}: ${v}`);
        });
        notesParts.push(`Landing page: ${window.location.pathname}`);
      }

      // traveller_code has a DB trigger generating it automatically.
      const { error: err } = await supabase.from("leads").insert({
        name: d.name,
        mobile: d.phone,
        email: d.email || null,
        notes: notesParts.join("\n") || null,
        channel: "website",
        platform: d.page_source || "website",
        customer_tag: d.trip_slug || d.destination || null,
        sales_status: "new_lead",
        disposition: "not_contacted",
      } as never);
      if (err) throw err;
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitLead,
    loading,
    success,
    error,
    reset: () => {
      setSuccess(false);
      setError(null);
    },
  };
}