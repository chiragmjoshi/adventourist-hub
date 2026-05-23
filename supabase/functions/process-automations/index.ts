import { createClient } from "npm:@supabase/supabase-js@2";
import { wrapInBrandShell } from "../_shared/emailShell.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

function fmtDate(d?: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return d || "";
  }
}

function fmtINR(n?: number | null) {
  if (n == null) return "";
  return "₹" + new Intl.NumberFormat("en-IN").format(n);
}

function resolveVariables(template: string, ctx: any): string {
  if (!template) return "";
  const lead = ctx.lead || {};
  const dest = ctx.destination || {};
  const itin = ctx.itinerary || {};
  const agent = ctx.agent || {};
  const cf = ctx.cashflow || {};
  const travelDate = cf.travel_start_date || lead.travel_date;
  let days: number | "" = "";
  if (travelDate) {
    const diff = (new Date(travelDate).getTime() - Date.now()) / 86400000;
    days = Math.round(diff);
  }
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

async function loadLeadContext(admin: any, leadId: string) {
  const { data: lead } = await admin
    .from("leads")
    .select("*, destinations(*), itineraries(*), users!leads_assigned_to_fkey(*)")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return {};
  const { data: cashflow } = await admin
    .from("trip_cashflow")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return {
    lead,
    destination: lead.destinations,
    itinerary: lead.itineraries,
    agent: lead.users,
    cashflow: cashflow || undefined,
  };
}

function matchConditions(rule: any, lead: any): boolean {
  const check = (arr: string[] | null, val: any) =>
    !arr || arr.length === 0 ? true : arr.includes(val);
  return (
    check(rule.condition_status, lead?.sales_status) &&
    check(rule.condition_disposition, lead?.disposition) &&
    check(rule.condition_platform, lead?.platform) &&
    check(rule.condition_channel, lead?.channel)
  );
}

function recipientsFor(channel: "wa" | "email", recipientType: string, ctx: any) {
  const out: { type: string; contact: string }[] = [];
  const customer = channel === "wa" ? ctx.lead?.mobile : ctx.lead?.email;
  const agent = channel === "wa" ? ctx.agent?.mobile : ctx.agent?.email;
  if ((recipientType === "customer" || recipientType === "both") && customer)
    out.push({ type: "customer", contact: customer });
  if ((recipientType === "agent" || recipientType === "both") && agent)
    out.push({ type: "agent", contact: agent });
  return out;
}

async function sendEmail(
  supabaseUrl: string,
  serviceKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

async function dispatchExecution(
  admin: any,
  supabaseUrl: string,
  serviceKey: string,
  executionId: string,
  rule: any,
  ctx: any,
  channel: "whatsapp" | "email",
  recipientContact: string,
) {
  let success = false;
  let errorMessage = "";
  let messagePreview = "";

  if (channel === "email") {
    const html = resolveVariables(rule.email_body || "", ctx);
    const subject = resolveVariables(rule.email_subject || rule.name || "Adventourist", ctx);
    messagePreview = html.replace(/<[^>]+>/g, "").slice(0, 200);
    const heroTitle = rule.email_hero_title
      ? resolveVariables(rule.email_hero_title, ctx)
      : "A note from <em>Adventourist</em>";
    const heroSubtitle = rule.email_hero_subtitle
      ? resolveVariables(rule.email_hero_subtitle, ctx)
      : undefined;
    const ctaUrl = rule.email_cta_url || "https://wa.me/919930400694";
    const ctaLabel = rule.email_cta_label || "Message us on WhatsApp →";
    const brandedHtml = wrapInBrandShell({
      heroTitle,
      heroSubtitle,
      bodyHtml: html,
      agentName: ctx.agent?.name,
      ctaUrl,
      ctaLabel,
      accentColor: "blaze",
    });
    const r = await sendEmail(supabaseUrl, serviceKey, recipientContact, subject, brandedHtml);
    success = r.success;
    if (!success) errorMessage = (r.error || "Email send failed").slice(0, 500);
  } else {
    // WhatsApp dispatch is handled client-side via aisensy.ts; skip here.
    errorMessage = "WhatsApp dispatch handled by client";
  }

  await admin
    .from("automation_executions")
    .update({
      status: success ? "sent" : "failed",
      message_preview: messagePreview,
      error_message: errorMessage || null,
      executed_at: new Date().toISOString(),
    })
    .eq("id", executionId);

  if (success) {
    await admin
      .from("automation_rules")
      .update({
        run_count: (rule.run_count || 0) + 1,
        last_run_at: new Date().toISOString(),
      })
      .eq("id", rule.id);
  }
}

async function scheduleRule(
  admin: any,
  supabaseUrl: string,
  serviceKey: string,
  rule: any,
  leadId: string,
  ctx: any,
  triggerEvent: string,
) {
  const channels: { ch: "whatsapp" | "email"; enabled: boolean; recipient: string }[] = [
    { ch: "whatsapp", enabled: !!rule.wa_enabled, recipient: rule.wa_recipient || "customer" },
    { ch: "email", enabled: !!rule.email_enabled, recipient: rule.email_recipient || "customer" },
  ];
  for (const c of channels) {
    if (!c.enabled) continue;
    // Server-side runner only handles email; WhatsApp continues to fire from the client.
    if (c.ch === "whatsapp") continue;
    const recips = recipientsFor("email", c.recipient, ctx);
    for (const r of recips) {
      const scheduled = new Date(
        Date.now() + (rule.delay_hours || 0) * 3600 * 1000,
      ).toISOString();
      const { data: exec } = await admin
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
        await dispatchExecution(
          admin,
          supabaseUrl,
          serviceKey,
          exec.id,
          rule,
          ctx,
          c.ch,
          r.contact,
        );
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const stats = { pending_processed: 0, date_rules_evaluated: 0, sent: 0, failed: 0 };

    // 1) Pending email executions whose scheduled_for has elapsed
    const { data: due } = await admin
      .from("automation_executions")
      .select("*, automation_rules(*)")
      .eq("status", "pending")
      .eq("channel", "email")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    for (const ex of due || []) {
      const rule = (ex as any).automation_rules;
      if (!rule) continue;
      stats.pending_processed++;
      if (!isInsideTimeWindow(rule.send_time_window_start, rule.send_time_window_end)) {
        await admin
          .from("automation_executions")
          .update({
            scheduled_for: nextAvailableSlot(rule.send_time_window_start).toISOString(),
          })
          .eq("id", ex.id);
        continue;
      }
      const ctx = ex.lead_id ? await loadLeadContext(admin, ex.lead_id) : {};
      const before = stats.sent;
      await dispatchExecution(
        admin,
        supabaseUrl,
        serviceKey,
        ex.id,
        rule,
        ctx,
        "email",
        ex.recipient_contact || "",
      );
      const { data: after } = await admin
        .from("automation_executions")
        .select("status")
        .eq("id", ex.id)
        .maybeSingle();
      if (after?.status === "sent") stats.sent++;
      else stats.failed++;
      if (before === stats.sent && after?.status !== "sent") {
        // counted
      }
    }

    // 2) Travel-date sweep (approaching / passed) — email-only here
    const { data: dateRules } = await admin
      .from("automation_rules")
      .select("*")
      .eq("is_active", true)
      .eq("email_enabled", true)
      .in("trigger_event", ["travel_date_approaching", "travel_date_passed"]);

    for (const rule of dateRules || []) {
      stats.date_rules_evaluated++;
      const offset = rule.trigger_days_before || 0;
      const target = new Date();
      if (rule.trigger_event === "travel_date_approaching") {
        target.setDate(target.getDate() + offset);
      } else {
        target.setDate(target.getDate() - offset);
      }
      const dateStr = target.toISOString().slice(0, 10);
      const { data: cfRows } = await admin
        .from("trip_cashflow")
        .select("lead_id")
        .eq("travel_start_date", dateStr)
        .not("lead_id", "is", null);

      for (const row of cfRows || []) {
        if (!row.lead_id) continue;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count } = await admin
          .from("automation_executions")
          .select("*", { count: "exact", head: true })
          .eq("rule_id", rule.id)
          .eq("lead_id", row.lead_id)
          .eq("channel", "email")
          .gte("created_at", todayStart.toISOString());
        if ((count || 0) > 0) continue;
        const ctx = await loadLeadContext(admin, row.lead_id);
        if (!ctx.lead || !matchConditions(rule, ctx.lead)) continue;
        await scheduleRule(
          admin,
          supabaseUrl,
          serviceKey,
          rule,
          row.lead_id,
          ctx,
          rule.trigger_event,
        );
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("process-automations error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error)?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});