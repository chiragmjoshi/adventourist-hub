import { supabase } from "@/integrations/supabase/client";

/**
 * AiSensy WhatsApp service — client-side wrapper.
 * The API key never leaves the server. All sends route through the
 * `send-whatsapp` edge function which fetches the key with the service role
 * after verifying the caller's role.
 */

export function formatMobile(mobile: string): string {
  let cleaned = mobile.replace(/[\s\-\(\)]/g, "");
  cleaned = cleaned.replace(/^\+/, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return "91" + cleaned;
}

export async function getTemplate(triggerEvent: string) {
  const { data } = await supabase
    .from("automation_templates" as any)
    .select("*")
    .eq("trigger_event", triggerEvent)
    .single();
  return data as any;
}

export async function sendWhatsAppMessage(
  templateName: string,
  mobile: string,
  variables: string[],
  userName: string
): Promise<{ success: boolean; response: any }> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: { templateName, mobile, variables, userName },
  });
  if (error) return { success: false, response: { error: error.message } };
  return { success: !!data?.success, response: data?.response ?? data };
}

export async function testWhatsAppConnection(
  overrideApiKey?: string
): Promise<{ success: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-whatsapp", {
    body: { testOnly: true, overrideApiKey },
  });
  if (error) return { success: false, error: error.message };
  return { success: !!data?.success, error: data?.error };
}
