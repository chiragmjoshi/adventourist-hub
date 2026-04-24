// Public REST API for new.adventourist.in and any other public consumer.
// Versioned under /v1/. No auth required for GET; POST /v1/leads is rate-limited.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, origin",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const cacheHeaders = {
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Naive in-memory rate limit (resets on cold start). Acceptable for v1.
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

function ok(data: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
function list(data: unknown[], extra: Record<string, string> = {}) {
  return new Response(JSON.stringify({ data, meta: { count: data.length } }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}
function fail(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function prefix: /functions/v1/public-api/v1/...
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("public-api");
  const route = idx >= 0 ? parts.slice(idx + 1) : parts;
  // route now looks like ["v1","destinations"] or ["v1","destinations","ladakh"]

  try {
    if (route[0] !== "v1") return fail(404, "not_found", "Use /v1/* endpoints");

    // GET /v1/destinations
    if (req.method === "GET" && route[1] === "destinations" && !route[2]) {
      const theme = url.searchParams.get("theme");
      const suitable = url.searchParams.get("suitable_for");
      const month = url.searchParams.get("month");
      let q = supabase.from("destinations").select("id,slug,name,about,hero_image,gallery,best_months,themes,suitable_for").eq("is_active", true);
      if (theme) q = q.contains("themes", [theme]);
      if (suitable) q = q.contains("suitable_for", [suitable]);
      if (month) q = q.contains("best_months", [month]);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return list(data ?? [], cacheHeaders);
    }

    // GET /v1/destinations/:slug
    if (req.method === "GET" && route[1] === "destinations" && route[2]) {
      const slug = route[2];
      const { data: dest, error } = await supabase
        .from("destinations").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
      if (error) throw error;
      if (!dest) return fail(404, "not_found", "Destination not found");
      const { data: itins } = await supabase
        .from("itineraries")
        .select("id,slug,headline,about,days,nights,price_per_person,hero_image,themes,suitable_for")
        .eq("destination_id", dest.id).eq("status", "published").order("price_per_person", { ascending: true });
      return ok({ ...dest, itineraries: itins ?? [] }, cacheHeaders);
    }

    // GET /v1/itineraries
    if (req.method === "GET" && route[1] === "itineraries" && !route[2]) {
      const destId = url.searchParams.get("destination_id");
      const theme = url.searchParams.get("theme");
      const minDays = url.searchParams.get("min_days");
      const maxDays = url.searchParams.get("max_days");
      const maxPrice = url.searchParams.get("max_price");
      let q = supabase.from("itineraries")
        .select("id,slug,headline,about,days,nights,price_per_person,hero_image,themes,suitable_for,best_months,destination_id")
        .eq("status", "published");
      if (destId) q = q.eq("destination_id", destId);
      if (theme) q = q.contains("themes", [theme]);
      if (minDays) q = q.gte("days", parseInt(minDays));
      if (maxDays) q = q.lte("days", parseInt(maxDays));
      if (maxPrice) q = q.lte("price_per_person", parseInt(maxPrice));
      const { data, error } = await q.order("price_per_person", { ascending: true });
      if (error) throw error;
      return list(data ?? [], cacheHeaders);
    }

    // GET /v1/itineraries/:slug
    if (req.method === "GET" && route[1] === "itineraries" && route[2]) {
      const { data: itin, error } = await supabase
        .from("itineraries").select("*").eq("slug", route[2]).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (!itin) return fail(404, "not_found", "Itinerary not found");
      let destination = null;
      if (itin.destination_id) {
        const { data: d } = await supabase.from("destinations")
          .select("id,slug,name,hero_image,testimonials").eq("id", itin.destination_id).maybeSingle();
        destination = d;
      }
      return ok({ ...itin, destination }, cacheHeaders);
    }

    // GET /v1/landing-pages/:slug
    if (req.method === "GET" && route[1] === "landing-pages" && route[2]) {
      const { data: page, error } = await supabase
        .from("landing_pages").select("*").eq("slug", route[2]).eq("is_active", true).maybeSingle();
      if (error) throw error;
      if (!page) return fail(404, "not_found", "Landing page not found");
      let itinerary = null, destination = null;
      if (page.itinerary_id) {
        const { data } = await supabase.from("itineraries")
          .select("headline,itinerary_days,inclusions,exclusions,gallery,days,nights").eq("id", page.itinerary_id).maybeSingle();
        itinerary = data;
      }
      if (page.destination_id) {
        const { data } = await supabase.from("destinations")
          .select("name,testimonials").eq("id", page.destination_id).maybeSingle();
        destination = data;
      }
      return ok({ ...page, itinerary, destination }, cacheHeaders);
    }

    // GET /v1/testimonials
    if (req.method === "GET" && route[1] === "testimonials") {
      const { data, error } = await supabase
        .from("destinations").select("name,slug,testimonials").eq("is_active", true);
      if (error) throw error;
      const flat: any[] = [];
      (data ?? []).forEach((d: any) => {
        (d.testimonials ?? []).forEach((t: any) => flat.push({ ...t, destination: d.name, destination_slug: d.slug }));
      });
      return list(flat, cacheHeaders);
    }

    // GET /v1/master-values/:type
    if (req.method === "GET" && route[1] === "master-values" && route[2]) {
      const { data, error } = await supabase
        .from("master_values").select("value,sort_order").eq("type", route[2]).eq("is_active", true)
        .order("sort_order").order("value");
      if (error) throw error;
      return list((data ?? []).map((r: any) => r.value), cacheHeaders);
    }

    // POST /v1/leads
    if (req.method === "POST" && route[1] === "leads") {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!rateLimit(ip)) return fail(429, "rate_limited", "Too many requests, please retry in a minute");

      let body: any;
      try { body = await req.json(); } catch { return fail(400, "invalid_json", "Body must be valid JSON"); }

      // Honeypot
      if (body.website && String(body.website).trim() !== "") return ok({ id: "ignored" });

      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const mobile = String(body.mobile ?? "").trim();
      if (name.length < 2 || name.length > 100) return fail(400, "invalid_name", "Name must be 2-100 chars");
      if (!isValidEmail(email)) return fail(400, "invalid_email", "Valid email required");
      if (!/^\d{7,15}$/.test(mobile.replace(/\D/g, ""))) return fail(400, "invalid_mobile", "Valid mobile required");

      const insertRow = {
        name, email, mobile,
        traveller_code: "",
        sales_status: "new_lead",
        disposition: "not_contacted",
        platform: body.platform ?? "Website",
        channel: body.channel ?? "Organic",
        campaign_type: body.campaign_type ?? null,
        ad_group: body.ad_group ?? null,
        destination_id: body.destination_id ?? null,
        itinerary_id: body.itinerary_id ?? null,
        landing_page_id: body.landing_page_id ?? null,
        travel_date: body.travel_date || null,
        notes: [
          body.pax ? `Pax: ${body.pax}` : null,
          body.message ? body.message : null,
        ].filter(Boolean).join("\n") || null,
      };

      const { data: lead, error } = await supabase.from("leads").insert(insertRow).select("id,traveller_code").single();
      if (error) {
        console.error("lead insert failed", error);
        return fail(500, "insert_failed", error.message);
      }

      // Timeline event (best-effort)
      await supabase.from("lead_timeline").insert({
        lead_id: lead.id,
        event_type: "lead_created",
        note: `Public enquiry from ${body.source || "new.adventourist.in"}`,
        metadata: { source: body.source ?? null, page: body.page ?? null, ip },
      });

      return new Response(JSON.stringify({ data: { id: lead.id, traveller_code: lead.traveller_code } }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return fail(404, "not_found", `No route for ${req.method} ${url.pathname}`);
  } catch (e: any) {
    console.error("public-api error", e);
    return fail(500, "server_error", e?.message ?? "Unknown error");
  }
});