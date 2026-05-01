import { supabase } from "@/integrations/supabase/client";
import { sendWhatsAppMessage } from "./aisensy";
import { format, differenceInDays } from "date-fns";

/* AUTOMATION ENGINE - flexible rule-driven dispatcher */

const TZ_OFFSET_MIN = 330; // IST

function nowInIST() {
  const now = new Date();
  return new Date(now.getTime() + (TZ_OFFSET_MIN - now.getTimezoneOffset()) * 60000);
}

function isInsideTimeWindow(start?: string | null, end?: string | null) {
  if (!start || !end) return true;
  const ist = nowInIST();
  const cur = ist.getHours() * 60 + ist.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return cur >= sh * 60 + sm && cur <= eh * 60 + em;
}

function nextAvailableSlot(start?: string | null): Date {
  if (!start) return new Date();
  const ist = nowInIST();
  const [sh, sm] = start.split(":").map(Number);
  const slot = new Date(ist);
  slot.setHours(sh, sm, 0, 0);
  if (slot <= ist) slot.setDate(slot.getDate() + 1);
  return new Date(slot.getTime() - (TZ_OFFSET_MIN - new Date().getTimezoneOffset()) * 60000);
}

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return format(new Date(d), "d MMMM yyyy"); } catch { return d; }
};

const fmtINR = (n?: number | null) => {
  if (n == null) return "";
  return "₹" + new Intl.NumberFormat("en-IN").format(n);
};

export interface VariableContext {
  lead?: any;
  destination?: any;
  itinerary?: any;
  agent?: any;
  cashflow?: any;
}

export function resolveVariables(template: string, ctx: VariableContext): string {
  if (!template) return "";
  const lead = ctx.lead || {};
  const dest = ctx.destination || {};
  const itin = ctx.itinerary || {};
  const agent = ctx.agent || {};
  const cf = ctx.cashflow || {};
  const travelDate = cf.travel_start_date || lead.travel_date;
  const days = travelDate ? differenceInDays(new Date(travelDate), new Date()) : "";

  const vars: Record<string, string> = {
    name: lead.name || "Traveller",
    destination: dest.name || "your destination",
    travel_date: fmtDate(travelDate),
    agent_name: agent.name || "Team Adventourist",
    price: fmtINR(itin.price_per_person),
    traveller_code: lead.traveller_code || "",
    itinerary_name: itin.headline || "",
    mobile: lead.mobile || "",
    email: lead.email || "",
    company_name: "Adventourist",
    platform: lead.platform || "",
    days_to_travel: String(days),
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function loadLeadContext(leadId: string): Promise<VariableContext> {
  const { data: lead } = await supabase
    .from("leads")
    .select("*, destinations(*), itineraries(*), users!leads_assigned_to_fkey(*)")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return {};

  const { data: cashflow } = await supabase
    .from("trip_cashflow")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    lead,
    destination: (lead as any).destinations,
    itinerary: (lead as any).itineraries,
    agent: (lead as any).users,
    cashflow: cashflow || undefined,
  };
}

function matchConditions(rule: any, lead: any): boolean {
  const check = (arr: string[] | null, val: any) => {
    if (!arr || arr.length === 0) return true;
    return arr.includes(val);
  };
  return (
    check(rule.condition_status, lead?.sales_status) &&
    check(rule.condition_disposition, lead?.disposition) &&
    check(rule.condition_platform, lead?.platform) &&
    check(rule.condition_channel, lead?.channel)
  );
}

function recipientsFor(channel: "wa" | "email", recipientType: string, ctx: VariableContext): { type: string; contact: string }[] {
  const out: { type: string; contact: string }[] = [];
  const customer = channel === "wa" ? ctx.lead?.mobile : ctx.lead?.email;
  const agent = channel === "wa" ? ctx.agent?.mobile : ctx.agent?.email;
  if (recipientType === "customer" || recipientType === "both") {
    if (customer) out.push({ type: "customer", contact: customer });
  }
  if (recipientType === "agent" || recipientType === "both") {
    if (agent) out.push({ type: "agent", contact: agent });
  }
  return out;
}

async function dispatchExecution(executionId: string, rule: any, ctx: VariableContext, channel: "whatsapp" | "email", recipientType: string, recipientContact: string) {
  let success = false;
  let errorMessage = "";
  let messagePreview = "";

  try {
    if (channel === "whatsapp") {
      const body = resolveVariables(rule.wa_message_body || "", ctx);
      messagePreview = body.slice(0, 200);
      const tplName = rule.wa_template_name || "";
      const result = await sendWhatsAppMessage(
        tplName,
        recipientContact,
        [body],
        recipientType === "agent" ? (ctx.agent?.name || "Agent") : (ctx.lead?.name || "Customer"),
      );
      success = result.success;
      if (!success) errorMessage = JSON.stringify(result.response).slice(0, 500);
    } else if (channel === "email") {
      const body = resolveVariables(rule.email_body || "", ctx);
      messagePreview = body.replace(/<[^>]+>/g, "").slice(0, 200);
      success = false;
      errorMessage = "Email transport not configured";
    }
  } catch (e: any) {
    errorMessage = e?.message || String(e);
  }

  await supabase
    .from("automation_executions")
    .update({
      status: success ? "sent" : "failed",
      message_preview: messagePreview,
      error_message: errorMessage || null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", executionId);

  if (success) {
    await supabase
      .from("automation_rules")
      .update({
        run_count: (rule.run_count || 0) + 1,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", rule.id);
  }

  return { success };
}

export async function evaluateRulesForLead(leadId: string, triggerEvent: string) {
  try {
    const { data: rules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)
      .eq("trigger_event", triggerEvent);

    if (!rules?.length) return;

    const ctx = await loadLeadContext(leadId);
    if (!ctx.lead) return;

    for (const rule of rules) {
      if (!matchConditions(rule, ctx.lead)) continue;
      await scheduleRule(rule, leadId, ctx, triggerEvent);
    }
  } catch (e) {
    console.error("evaluateRulesForLead error", e);
  }
}

async function scheduleRule(rule: any, leadId: string, ctx: VariableContext, triggerEvent: string) {
  const channels: { ch: "whatsapp" | "email"; enabled: boolean; recipient: string }[] = [
    { ch: "whatsapp", enabled: !!rule.wa_enabled, recipient: rule.wa_recipient || "customer" },
    { ch: "email", enabled: !!rule.email_enabled, recipient: rule.email_recipient || "customer" },
  ];

  for (const c of channels) {
    if (!c.enabled) continue;
    const recips = recipientsFor(c.ch === "wa" ? "wa" : "email", c.recipient, ctx);
    for (const r of recips) {
      const scheduled = new Date(Date.now() + (rule.delay_hours || 0) * 3600 * 1000).toISOString();
      const { data: exec } = await supabase
        .from("automation_executions")
        .insert({
          rule_id: rule.id,
          lead_id: leadId,
          trigger_event: triggerEvent,
          channel: c.ch,
          recipient_type: r.type,
          recipient_contact: r.contact,
          status: "pending",
          scheduled_for: scheduled,
        })
        .select("id")
        .single();

      if (
        (rule.delay_hours || 0) === 0 &&
        isInsideTimeWindow(rule.send_time_window_start, rule.send_time_window_end) &&
        exec?.id
      ) {
        await dispatchExecution(exec.id, rule, ctx, c.ch, r.type, r.contact);
      }
    }
  }
}

export async function processAutomationQueue() {
  try {
    const { data: due } = await supabase
      .from("automation_executions")
      .select("*, automation_rules(*)")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    for (const ex of due || []) {
      const rule = (ex as any).automation_rules;
      if (!rule) continue;
      if (!isInsideTimeWindow(rule.send_time_window_start, rule.send_time_window_end)) {
        await supabase
          .from("automation_executions")
          .update({ scheduled_for: nextAvailableSlot(rule.send_time_window_start).toISOString() })
          .eq("id", ex.id);
        continue;
      }
      const ctx = ex.lead_id ? await loadLeadContext(ex.lead_id) : {};
      await dispatchExecution(ex.id, rule, ctx, ex.channel as any, ex.recipient_type || "customer", ex.recipient_contact || "");
    }

    // Travel date / past trip rules
    const { data: dateRules } = await supabase
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)
      .in("trigger_event", ["travel_date_approaching", "travel_date_passed"]);

    for (const rule of dateRules || []) {
      const offset = rule.trigger_days_before || 0;
      const target = new Date();
      if (rule.trigger_event === "travel_date_approaching") {
        target.setDate(target.getDate() + offset);
      } else {
        target.setDate(target.getDate() - offset);
      }
      const dateStr = format(target, "yyyy-MM-dd");
      const { data: cfRows } = await supabase
        .from("trip_cashflow")
        .select("lead_id")
        .eq("travel_start_date", dateStr)
        .not("lead_id", "is", null);

      for (const row of cfRows || []) {
        if (!row.lead_id) continue;
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const { count } = await supabase
          .from("automation_executions")
          .select("*", { count: "exact", head: true })
          .eq("rule_id", rule.id)
          .eq("lead_id", row.lead_id)
          .gte("created_at", todayStart.toISOString());
        if ((count || 0) > 0) continue;
        const ctx = await loadLeadContext(row.lead_id);
        if (!ctx.lead || !matchConditions(rule, ctx.lead)) continue;
        await scheduleRule(rule, row.lead_id, ctx, rule.trigger_event);
      }
    }
  } catch (e) {
    console.error("processAutomationQueue error", e);
  }
}

export async function sendTestMessage(rule: any, channel: "whatsapp" | "email", contact: string) {
  const dummyCtx: VariableContext = {
    lead: { name: "Rahul Sharma", traveller_code: "MA2600042", mobile: contact, email: contact, platform: "Google" },
    destination: { name: "Ladakh" },
    itinerary: { headline: "7-Day Ladakh Adventure", price_per_person: 29999 },
    agent: { name: "Minal", mobile: "+919930400694", email: "minal@adventourist.in" },
    cashflow: { travel_start_date: format(new Date(Date.now() + 5 * 86400000), "yyyy-MM-dd") },
  };

  if (channel === "whatsapp") {
    const body = resolveVariables(rule.wa_message_body || "", dummyCtx);
    return await sendWhatsAppMessage(rule.wa_template_name || "", contact, [body], dummyCtx.lead.name);
  }
  return { success: false, response: { error: "Email transport not configured" } };
}

export const DUMMY_PREVIEW_CTX: VariableContext = {
  lead: { name: "Rahul Sharma", traveller_code: "MA2600042", mobile: "+919876543210", email: "rahul@example.com", platform: "Google" },
  destination: { name: "Ladakh" },
  itinerary: { headline: "7-Day Ladakh Adventure", price_per_person: 29999 },
  agent: { name: "Minal", mobile: "+919930400694", email: "minal@adventourist.in" },
  cashflow: { travel_start_date: format(new Date(Date.now() + 5 * 86400000), "yyyy-MM-dd") },
};
