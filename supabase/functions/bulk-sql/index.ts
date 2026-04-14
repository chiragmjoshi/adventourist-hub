import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  const { sql } = await req.json();
  if (!sql) {
    return new Response(JSON.stringify({ error: "No sql provided" }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use the database URL directly for pg connection
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
  
  // Use Deno's built-in postgres
  const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
  
  const pool = new Pool(dbUrl, 1, true);
  const connection = await pool.connect();
  
  try {
    const result = await connection.queryObject(sql);
    return new Response(JSON.stringify({ 
      success: true, 
      rowCount: result.rowCount 
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  } finally {
    connection.release();
    await pool.end();
  }
});
