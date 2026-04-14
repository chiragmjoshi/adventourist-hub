import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage } from "./aisensy";

/**
 * Process pending automation queue items.
 * Called on app load and every 30 minutes.
 */
export async function processAutomationQueue(): Promise<void> {
  try {
    const { data: pendingItems } = await supabase
      .from("automation_queue")
      .select("*, automation_templates(name, aisensy_template_name)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .limit(20);

    if (!pendingItems?.length) return;

    for (const item of pendingItems) {
      // Mark as processing
      await supabase
        .from("automation_queue")
        .update({
          status: "processing",
          attempts: (item.attempts || 0) + 1,
          last_attempted_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      const templateName = (item.automation_templates as any)?.aisensy_template_name;
      if (!templateName) {
        await supabase
          .from("automation_queue")
          .update({ status: "failed", aisensy_response: { error: "No template name" } })
          .eq("id", item.id);
        continue;
      }

      const result = await sendWhatsAppMessage(
        templateName,
        item.recipient_mobile,
        Array.isArray(item.variables) ? item.variables : [],
        (item as any).recipient_name || "Customer"
      );

      await supabase
        .from("automation_queue")
        .update({
          status: result.success ? "sent" : "failed",
          aisensy_response: result.response,
        })
        .eq("id", item.id);

      // Log to automations_log
      await supabase.from("automations_log").insert({
        lead_id: item.lead_id,
        cashflow_id: item.cashflow_id,
        template_id: item.template_id,
        trigger_event: item.trigger_event,
        template_name: templateName,
        recipient_mobile: item.recipient_mobile,
        recipient_name: (item as any).recipient_name,
        variables: item.variables,
        channel: "whatsapp",
        status: result.success ? "sent" : "failed",
        response_payload: result.response,
      });

      // Log to lead timeline
      if (result.success && item.lead_id) {
        await supabase.from("lead_timeline").insert({
          lead_id: item.lead_id,
          event_type: "whatsapp_sent",
          note: `✅ ${item.trigger_event} WhatsApp sent`,
        });
      }
    }
  } catch (e) {
    console.error("processAutomationQueue error:", e);
  }
}
