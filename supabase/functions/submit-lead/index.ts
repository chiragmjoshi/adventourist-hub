import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const rateBucket = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || entry.resetAt < now) {
    rateBucket.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface LeadBody {
  name?: string;
  mobile?: string;
  email?: string;
  destination_name?: string;
  travel_date?: string;
  group_size?: string;
  budget_range?: string;
  notes?: string;
  channel?: string;
  platform?: string;
  landing_page_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_url?: string;
  referrer_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  let body: LeadBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const name = body.name?.trim();
  const mobile = body.mobile?.trim();
  if (!name || !mobile) {
    return json(400, { error: "Name and mobile are required" });
  }

  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) {
    return json(429, { error: "Too many requests. Please try again in a minute." });
  }

  // Honeypot
  if ((body as any).website && String((body as any).website).trim() !== "") {
    return json(200, { success: true, traveller_code: "ignored" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("submit-lead: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json(500, { error: "Failed to create lead" });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    // Resolve destination
    let destination_id: string | null = null;
    if (body.destination_name?.trim()) {
      const { data: dest, error: destErr } = await supabase
        .from("destinations")
        .select("id")
        .ilike("name", body.destination_name.trim())
        .maybeSingle();
      if (destErr) console.error("submit-lead: destination lookup", destErr);
      destination_id = dest?.id ?? null;
    }

    // Generate ADV traveller code
    const { data: codeData, error: codeErr } = await supabase.rpc(
      "generate_adv_traveller_code",
    );
    if (codeErr || !codeData) {
      console.error("submit-lead: traveller code error", codeErr);
      return json(500, { error: "Failed to create lead" });
    }
    const traveller_code = codeData as string;

    // Insert lead
    const insertPayload = {
      traveller_code,
      name,
      mobile,
      email: body.email ?? null,
      destination_id,
      travel_date: body.travel_date ?? null,
      group_size: body.group_size ?? null,
      budget_range: body.budget_range ?? null,
      notes: body.notes ?? null,
      channel: body.channel ?? "Website",
      platform: body.platform ?? "Organic",
      landing_page_id: body.landing_page_id ?? null,
      utm_source: body.utm_source ?? null,
      utm_medium: body.utm_medium ?? null,
      utm_campaign: body.utm_campaign ?? null,
      utm_content: body.utm_content ?? null,
      utm_term: body.utm_term ?? null,
      landing_url: body.landing_url ?? null,
      referrer_url: body.referrer_url ?? null,
      sales_status: "new_lead",
      disposition: "not_contacted",
    };

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select("id, traveller_code")
      .single();

    if (leadErr || !lead) {
      console.error("submit-lead: insert lead error", leadErr);
      return json(500, { error: "Failed to create lead" });
    }

    // Timeline
    const { error: tlErr } = await supabase.from("lead_timeline").insert({
      lead_id: lead.id,
      event_type: "lead_created",
      note: "Lead submitted from website",
      metadata: {
        channel: insertPayload.channel,
        platform: insertPayload.platform,
        landing_page_id: insertPayload.landing_page_id,
        utm_source: insertPayload.utm_source,
        utm_medium: insertPayload.utm_medium,
        utm_campaign: insertPayload.utm_campaign,
        utm_content: insertPayload.utm_content,
        utm_term: insertPayload.utm_term,
        landing_url: insertPayload.landing_url,
        referrer_url: insertPayload.referrer_url,
      },
    });
    if (tlErr) console.error("submit-lead: timeline insert error", tlErr);

    return json(200, {
      success: true,
      traveller_code: lead.traveller_code,
      lead_id: lead.id,
    });
  } catch (err) {
    console.error("submit-lead: unexpected error", err);
    return json(500, { error: "Failed to create lead" });
  }
});