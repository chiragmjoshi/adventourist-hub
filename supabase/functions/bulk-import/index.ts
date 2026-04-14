import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, rows } = await req.json();

    if (action === "flush") {
      // Delete in order to avoid FK issues
      await supabase.from("lead_timeline").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("lead_comments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("automations_log").delete().not("lead_id", "is", null);
      await supabase.from("automation_queue").delete().not("lead_id", "is", null);
      // Delete trip_cashflow referencing leads
      await supabase.from("trip_cashflow_vendors").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("trip_cashflow").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      return new Response(JSON.stringify({ success: true, action: "flush" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "insert" && rows) {
      const { data, error } = await supabase.from("leads").insert(rows);
      if (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, inserted: rows.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
