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
  itinerary_slug?: string;
  page_source?: string;
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
    // Resolve destination + itinerary
    let destination_id: string | null = null;
    let itinerary_id: string | null = null;

    // Prefer landing page FKs when a landing_page_id is provided
    if (body.landing_page_id) {
      const { data: lp, error: lpErr } = await supabase
        .from("landing_pages")
        .select("destination_id, itinerary_id")
        .eq("id", body.landing_page_id)
        .maybeSingle();
      if (lpErr) console.error("submit-lead: landing page lookup", lpErr);
      if (lp) {
        destination_id = lp.destination_id ?? null;
        itinerary_id = lp.itinerary_id ?? null;
      }
    }

    // Fallback: resolve destination by name
    if (!destination_id && body.destination_name?.trim()) {
      const { data: dest, error: destErr } = await supabase
        .from("destinations")
        .select("id")
        .ilike("name", body.destination_name.trim())
        .maybeSingle();
      if (destErr) console.error("submit-lead: destination lookup", destErr);
      destination_id = dest?.id ?? null;
    }

    // Resolve itinerary by slug (organic trip-detail submissions)
    if (!itinerary_id && body.itinerary_slug?.trim()) {
      const { data: it, error: itErr } = await supabase
        .from("itineraries")
        .select("id, destination_id")
        .eq("slug", body.itinerary_slug.trim())
        .maybeSingle();
      if (itErr) console.error("submit-lead: itinerary slug lookup", itErr);
      if (it) {
        itinerary_id = it.id;
        if (!destination_id) destination_id = it.destination_id ?? null;
      }
    }

    // If we got an itinerary but no destination, hydrate destination from itinerary
    if (itinerary_id && !destination_id) {
      const { data: it } = await supabase
        .from("itineraries")
        .select("destination_id")
        .eq("id", itinerary_id)
        .maybeSingle();
      destination_id = it?.destination_id ?? null;
    }

    // Merge structured extras into notes (leads has no group_size/budget columns)
    const extraNotes: string[] = [];
    if (body.notes) extraNotes.push(body.notes);
    if (body.group_size) extraNotes.push(`Group size: ${body.group_size}`);
    if (body.budget_range) extraNotes.push(`Budget: ${body.budget_range}`);
    if (body.page_source) extraNotes.push(`Source page: ${body.page_source}`);
    if (body.landing_url) extraNotes.push(`Landing URL: ${body.landing_url}`);
    if (body.referrer_url) extraNotes.push(`Referrer: ${body.referrer_url}`);

    // Insert lead — leave traveller_code empty so the DB trigger
    // (generate_traveller_code) produces the standard MA26… format.
    const insertPayload = {
      traveller_code: "",
      name,
      mobile,
      email: body.email ?? null,
      destination_id,
      itinerary_id,
      landing_page_id: body.landing_page_id ?? null,
      travel_date: body.travel_date ?? null,
      notes: extraNotes.length ? extraNotes.join("\n") : null,
      channel: body.channel ?? "Website",
      platform: body.platform ?? "Organic",
      source: "website",
      sales_status: "New Lead",
      disposition: "Not Contacted",
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

    // Persist UTM / attribution into lead_tracking
    if (
      body.utm_source || body.utm_medium || body.utm_campaign ||
      body.utm_content || body.utm_term
    ) {
      const { error: trErr } = await supabase.from("lead_tracking").insert({
        lead_id: lead.id,
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        utm_content: body.utm_content ?? null,
        utm_term: body.utm_term ?? null,
      });
      if (trErr) console.error("submit-lead: lead_tracking insert error", trErr);
    }

    // Timeline
    const { error: tlErr } = await supabase.from("lead_timeline").insert({
      lead_id: lead.id,
      event_type: "lead_created",
      note: body.page_source
        ? `Lead submitted from website (${body.page_source})`
        : "Lead submitted from website",
      metadata: {
        channel: insertPayload.channel,
        platform: insertPayload.platform,
        landing_page_id: insertPayload.landing_page_id,
        itinerary_id,
        destination_id,
        itinerary_slug: body.itinerary_slug ?? null,
        page_source: body.page_source ?? null,
        utm_source: body.utm_source ?? null,
        utm_medium: body.utm_medium ?? null,
        utm_campaign: body.utm_campaign ?? null,
        utm_content: body.utm_content ?? null,
        utm_term: body.utm_term ?? null,
        landing_url: body.landing_url ?? null,
        referrer_url: body.referrer_url ?? null,
      },
    });
    if (tlErr) console.error("submit-lead: timeline insert error", tlErr);

    console.log("submit-lead: created", {
      lead_id: lead.id,
      traveller_code: lead.traveller_code,
      destination_id,
      itinerary_id,
      channel: insertPayload.channel,
      platform: insertPayload.platform,
      page_source: body.page_source ?? null,
    });

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