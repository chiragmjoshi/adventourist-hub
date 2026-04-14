import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { action, table, rows, sql } = await req.json();

    if (action === "sql" && sql) {
      const { error } = await supabase.rpc("exec_sql", { query: sql }).maybeSingle();
      if (error) {
        // Try direct REST approach - use raw SQL via pg
        const dbUrl = Deno.env.get("SUPABASE_DB_URL");
        if (!dbUrl) return new Response(JSON.stringify({ error: "No DB URL" }), { status: 500, headers: corsHeaders });
        
        const { Client } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
        const client = new Client(dbUrl);
        await client.connect();
        const result = await client.queryObject(sql);
        await client.end();
        return new Response(JSON.stringify({ ok: true, rowCount: result.rowCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "insert" && table && rows) {
      const { error } = await supabase.from(table).insert(rows);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, count: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
