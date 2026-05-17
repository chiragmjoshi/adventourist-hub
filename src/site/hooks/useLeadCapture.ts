import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LeadData {
  name: string;
  phone: string;
  email?: string;
  destination?: string;
  travel_month?: string;
  travel_date?: string;
  group_size?: string;
  budget?: string;
  message?: string;
  /** Logical source of the form, used as the lead `channel`. Defaults to "website" (organic). */
  page_source?: string;
  /** Optional trip context — when the lead came from a specific itinerary card / detail page. */
  trip_title?: string;
  trip_slug?: string;
  trip_price?: string;
}

function captureUTMs(): Record<string, string | undefined> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") ?? undefined,
    utm_medium: p.get("utm_medium") ?? undefined,
    utm_campaign: p.get("utm_campaign") ?? undefined,
    utm_content: p.get("utm_content") ?? undefined,
    utm_term: p.get("utm_term") ?? undefined,
    landing_url: window.location.pathname + window.location.search,
    referrer_url: document.referrer || undefined,
  };
}

/**
 * Submits a public website lead via the `submit-lead` edge function.
 * The function generates the ADV traveller code, creates a timeline entry,
 * and tags the lead with Platform: Organic, Channel: Website.
 */
export function useLeadCapture() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = async (d: LeadData) => {
    setLoading(true);
    setError(null);
    try {
      // Stash trip / month / budget / message context in notes so admin sees it.
      const notesParts: string[] = [];
      if (d.trip_title) {
        notesParts.push(
          `Interested in: ${d.trip_title}${d.trip_slug ? ` (${d.trip_slug})` : ""}${d.trip_price ? ` — ${d.trip_price}` : ""}`,
        );
      }
      if (d.travel_month) notesParts.push(`Travel month: ${d.travel_month}`);
      if (d.message) notesParts.push(`Message:\n${d.message}`);

      const { data, error: invokeErr } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: d.name,
          mobile: d.phone,
          email: d.email || undefined,
          destination_name: d.destination || undefined,
          travel_date: d.travel_date || undefined,
          group_size: d.group_size || undefined,
          budget_range: d.budget || undefined,
          notes: notesParts.length ? notesParts.join("\n") : undefined,
          channel: "Website",
          platform: "Organic",
          itinerary_slug: d.trip_slug || undefined,
          page_source: d.page_source || undefined,
          ...captureUTMs(),
        },
      });

      if (invokeErr) throw invokeErr;
      if (data && (data as any).error) throw new Error((data as any).error);
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      // Non-blocking — user has already been handed off to WhatsApp.
      try {
        toast.error("Couldn't save your details. Please continue on WhatsApp.");
      } catch { /* toast may not be mounted on every page */ }
      console.error("submitLead failed:", e);
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
