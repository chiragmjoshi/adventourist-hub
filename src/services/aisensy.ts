import { supabase } from "@/integrations/supabase/client";

/**
 * AiSensy WhatsApp message sending service.
 * 
 * IMPORTANT: The AiSensy API key is stored in automation_settings table
 * and fetched at runtime. Never hardcode or store in frontend env.
 */

interface AiSensyPayload {
  apiKey: string;
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source: string;
  media?: { url: string; filename: string };
}

export function formatMobile(mobile: string): string {
  let cleaned = mobile.replace(/[\s\-\(\)]/g, "");
  cleaned = cleaned.replace(/^\+/, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  if (cleaned.startsWith("0")) cleaned = cleaned.substring(1);
  return "91" + cleaned;
}

export async function getAutomationSetting(key: string): Promise<string> {
  const { data } = await supabase
    .from("automation_settings")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value || "";
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
  const formattedMobile = formatMobile(mobile);
  const apiKey = await getAutomationSetting("aisensy_api_key");

  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_API_KEY") {
    return { success: false, response: { error: "AiSensy API key not configured" } };
  }

  const payload: AiSensyPayload = {
    apiKey,
    campaignName: templateName,
    destination: formattedMobile,
    userName,
    templateParams: variables,
    source: "adventourist-crm",
  };

  try {
    const response = await fetch(
      "https://backend.aisensy.com/campaign/t1/api/v2",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    return { success: response.ok, response: data };
  } catch (error) {
    return { success: false, response: error };
  }
}
