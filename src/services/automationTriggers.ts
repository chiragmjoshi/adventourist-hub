import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage, getTemplate, getAutomationSetting } from "./aisensy";
import { format } from "date-fns";

const fmtDate = (d: string) => {
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
};

async function logAutomation(entry: {
  lead_id: string;
  trigger_event: string;
  template_name?: string;
  recipient_mobile: string;
  status: string;
  response_payload?: any;
  channel?: string;
}) {
  await supabase.from("automations_log").insert({
    lead_id: entry.lead_id,
    trigger_event: entry.trigger_event,
    template_name: entry.template_name || entry.trigger_event,
    recipient_mobile: entry.recipient_mobile,
    recipient_email: null,
    channel: entry.channel || "whatsapp",
    status: entry.status,
    response_payload: entry.response_payload || {},
  });
}

async function addTimelineEvent(leadId: string, note: string) {
  await supabase.from("lead_timeline").insert({
    lead_id: leadId,
    event_type: "whatsapp_sent",
    note,
  });
}

/**
 * TRIGGER 1: File Closed — send trip confirmation to customer
 * Variables: {{1}}=first name, {{2}}=destination, {{3}}=travel date, {{4}}=agent name
 */
export async function triggerFileClosedAutomation(leadId: string) {
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("*, destinations(name), users!leads_assigned_to_fkey(name)")
      .eq("id", leadId)
      .single();

    if (!lead?.mobile) return;

    const template = await getTemplate("file_closed");
    if (!template?.is_active) return;

    const { data: cashflow } = await supabase
      .from("trip_cashflow")
      .select("travel_start_date")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const variables = [
      lead.name.split(" ")[0],                                       // {{1}} customer first name
      (lead.destinations as any)?.name || "your destination",        // {{2}} destination name
      cashflow?.travel_start_date ? fmtDate(cashflow.travel_start_date) : "as planned", // {{3}} travel date
      (lead.users as any)?.name || "our team",                       // {{4}} agent name
    ];

    const result = await sendWhatsAppMessage(
      template.aisensy_template_name,
      lead.mobile,
      variables,
      lead.name
    );

    await logAutomation({
      lead_id: leadId,
      trigger_event: "file_closed",
      template_name: template.aisensy_template_name,
      recipient_mobile: lead.mobile,
      status: result.success ? "sent" : "failed",
      response_payload: result.response,
    });

    if (result.success) {
      await addTimelineEvent(leadId, "Trip confirmation WhatsApp sent to customer");
    }
  } catch (e) {
    console.error("triggerFileClosedAutomation error:", e);
  }
}

/**
 * TRIGGER 5: Follow-up Reminder — send to assigned agent
 * Variables: {{1}}=agent first name, {{2}}=customer full name, {{3}}=traveller code, {{4}}=destination
 */
export async function triggerFollowUpReminder(leadId: string) {
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("*, destinations(name), users!leads_assigned_to_fkey(name, mobile)")
      .eq("id", leadId)
      .single();

    const agent = lead?.users as any;
    if (!agent?.mobile) return;

    const template = await getTemplate("follow_up_reminder");
    if (!template?.is_active) return;

    const variables = [
      agent.name.split(" ")[0],                                      // {{1}} agent first name
      lead!.name,                                                    // {{2}} customer full name
      lead!.traveller_code,                                          // {{3}} traveller code
      (lead!.destinations as any)?.name || "their destination",      // {{4}} destination name
    ];

    const result = await sendWhatsAppMessage(
      template.aisensy_template_name,
      agent.mobile,
      variables,
      agent.name
    );

    await logAutomation({
      lead_id: leadId,
      trigger_event: "follow_up_reminder",
      template_name: template.aisensy_template_name,
      recipient_mobile: agent.mobile,
      status: result.success ? "sent" : "failed",
      response_payload: result.response,
    });
  } catch (e) {
    console.error("triggerFollowUpReminder error:", e);
  }
}

/**
 * Queue time-based automations when a cashflow is saved with travel dates.
 * Variables per template:
 *   pre_trip_3days: {{1}}=first name, {{2}}=destination, {{3}}=travel date
 *   safe_journey:   {{1}}=first name, {{2}}=destination
 *   review_request: {{1}}=first name, {{2}}=destination, {{3}}=review link
 */
export async function queueTripAutomations(cashflowId: string) {
  try {
    const { data: cf } = await supabase
      .from("trip_cashflow")
      .select("*, destinations(name)")
      .eq("id", cashflowId)
      .single();

    if (!cf?.lead_id || !cf?.travel_start_date || !cf?.travel_end_date) return;

    const { data: lead } = await supabase
      .from("leads")
      .select("name, mobile")
      .eq("id", cf.lead_id)
      .single();

    if (!lead?.mobile) return;

    // Delete existing pending queue items for this cashflow to avoid duplicates
    await supabase
      .from("automation_queue" as any)
      .delete()
      .eq("cashflow_id", cashflowId)
      .eq("status", "pending");

    const templates: Record<string, any> = {};
    for (const evt of ["pre_trip_3days", "safe_journey", "review_request"]) {
      templates[evt] = await getTemplate(evt);
    }

    const startDate = new Date(cf.travel_start_date + "T00:00:00+05:30");
    const endDate = new Date(cf.travel_end_date + "T00:00:00+05:30");
    const destName = (cf.destinations as any)?.name || "your destination";

    // Pre-trip: 3 days before at 9AM IST
    const preTripDate = new Date(startDate);
    preTripDate.setDate(preTripDate.getDate() - 3);
    preTripDate.setHours(3, 30, 0, 0); // 9 AM IST = 3:30 AM UTC

    // Safe journey: day of travel at 7AM IST
    const safeJourneyDate = new Date(startDate);
    safeJourneyDate.setHours(1, 30, 0, 0); // 7 AM IST = 1:30 AM UTC

    // Review: day after return at 10AM IST
    const reviewDate = new Date(endDate);
    reviewDate.setDate(reviewDate.getDate() + 1);
    reviewDate.setHours(4, 30, 0, 0); // 10 AM IST = 4:30 AM UTC

    const reviewLink = await getAutomationSetting("review_link");

    const queueItems = [
      {
        lead_id: cf.lead_id,
        cashflow_id: cashflowId,
        template_id: templates.pre_trip_3days?.id || null,
        trigger_event: "pre_trip_3days",
        scheduled_for: preTripDate.toISOString(),
        recipient_mobile: lead.mobile,
        variables: [lead.name.split(" ")[0], destName, fmtDate(cf.travel_start_date)], // {{1}}, {{2}}, {{3}}
        status: "pending",
      },
      {
        lead_id: cf.lead_id,
        cashflow_id: cashflowId,
        template_id: templates.safe_journey?.id || null,
        trigger_event: "safe_journey",
        scheduled_for: safeJourneyDate.toISOString(),
        recipient_mobile: lead.mobile,
        variables: [lead.name.split(" ")[0], destName], // {{1}}, {{2}}
        status: "pending",
      },
      {
        lead_id: cf.lead_id,
        cashflow_id: cashflowId,
        template_id: templates.review_request?.id || null,
        trigger_event: "review_request",
        scheduled_for: reviewDate.toISOString(),
        recipient_mobile: lead.mobile,
        variables: [lead.name.split(" ")[0], destName, reviewLink || ""], // {{1}}, {{2}}, {{3}}
        status: "pending",
      },
    ];

    await supabase.from("automation_queue" as any).insert(queueItems);
    return queueItems.length;
  } catch (e) {
    console.error("queueTripAutomations error:", e);
    return 0;
  }
}