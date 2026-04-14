import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage } from "./aisensy";

/**
 * Process pending automation queue items.
 * Called on app load — runs silently.
 */
export async function processAutomationQueue() {
  try {
    const { data: pendingItems } = await supabase
      .from("automation_queue" as any)
      .select("*, automation_templates(*)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3);

    if (!pendingItems?.length) return;

    for (const item of pendingItems as any[]) {
      // Mark as processing
      await supabase
        .from("automation_queue" as any)
        .update({
          status: "processing",
          attempts: (item.attempts || 0) + 1,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      const templateName = item.automation_templates?.aisensy_template_name;
      if (!templateName) {
        await supabase
          .from("automation_queue" as any)
          .update({ status: "failed", aisensy_response: { error: "No template name" } })
          .eq("id", item.id);
        continue;
      }

      const result = await sendWhatsAppMessage(
        templateName,
        item.recipient_mobile,
        Array.isArray(item.variables) ? item.variables : [],
        "Adventourist"
      );

      await supabase
        .from("automation_queue" as any)
        .update({
          status: result.success ? "sent" : "failed",
          aisensy_response: result.response,
        })
        .eq("id", item.id);

      // Log to automations_log
      await supabase.from("automations_log").insert({
        lead_id: item.lead_id,
        trigger_event: item.trigger_event,
        template_name: templateName,
        recipient_mobile: item.recipient_mobile,
        channel: "whatsapp",
        status: result.success ? "sent" : "failed",
        response_payload: result.response,
      });

      // Log to lead timeline
      if (result.success && item.lead_id) {
        await supabase.from("lead_timeline").insert({
          lead_id: item.lead_id,
          event_type: "whatsapp_sent",
          note: `${item.trigger_event} WhatsApp sent`,
        });
      }
    }
  } catch (e) {
    console.error("processAutomationQueue error:", e);
  }
}
