import { supabase } from "@/integrations/supabase/client";
import { trackLead } from "@/site/lib/pixel";

/**
 * The ONE shared success path for every public enquiry form.
 * Saves via the submit-lead function, and only after the backend confirms
 * the save fires the lead conversion with the real saved CRM record id.
 */
export async function submitLeadRecord(body: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("submit-lead", { body });
  if (error) throw error;
  if (data && (data as any).error) throw new Error((data as any).error);
  const leadId = ((data as any)?.lead_id as string | undefined) ?? null;
  trackLead(leadId);
  return leadId;
}
